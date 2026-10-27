/*
  Checks 2 things about the helper, over real http requests, against BOTH helpers (server.js and server.py):
    1. Safety: no request, however badly formed, can stop the helper or get a 5xx answer.
       (For example GET /% used to stop the Node helper.)
    2. Lost updates: a save that says which copy of the file it was based on (If-Match) is refused with
       409 if the file has changed since, and apps/shared/js/store.js then reads again, makes the same
       change again and saves. An older app that sends no version still saves as before.
  Run: node maintainers/test-helper-safety.js           (the Node helper, and the Python one if python3 is there)
       node maintainers/test-helper-safety.js js        (only apps/server/server.js)
       node maintainers/test-helper-safety.js py        (only apps/server/server.py)

  It works on a scratch copy of the helper in a temporary folder, so nothing is ever written into the kit.
  It starts the helper on a free port (TLOS_PORT), so it needs to be allowed to open a local port. If it isn't,
  this prints "COULD NOT RUN" and exits with 2 instead of passing. Exits 1 if any check fails.
*/
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { spawn, spawnSync } = require("child_process");

const KIT = path.join(__dirname, "..");

function freePort() {
  return new Promise(function (resolve, reject) {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", function () { const port = probe.address().port; probe.close(function () { resolve(port); }); });
  });
}

function scratchCopy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "helper-safety-test-"));
  fs.mkdirSync(path.join(root, "apps", "server"), { recursive: true });
  ["server.js", "server.py"].forEach(function (f) { fs.copyFileSync(path.join(KIT, "apps", "server", f), path.join(root, "apps", "server", f)); });
  fs.mkdirSync(path.join(root, "apps", "plain", "data"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "plain", "data", "plain.json"), '{"n":0,"list":[]}\n');
  fs.writeFileSync(path.join(root, "apps", "installed.json"), JSON.stringify({ tools: [
    { id: "plain", name: "Plain", app: "apps/plain/", dataFiles: ["apps/plain/data/plain.json"] }
  ] }));
  return root;
}

function request(port, method, urlPath, options) {
  const o = options || {};
  return new Promise(function (resolve, reject) {
    const headers = Object.assign({}, o.headers || {});
    if (o.type) headers["Content-Type"] = o.type;
    if (o.body && !headers["Content-Length"]) headers["Content-Length"] = o.body.length;
    const req = http.request({ host: "127.0.0.1", port: port, method: method, path: urlPath, headers: headers, agent: false }, function (res) {
      const chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () { resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }); });
    });
    req.on("error", reject);
    if (o.body) req.write(o.body);
    req.end();
  });
}
function json(res) { return JSON.parse(res.body.toString("utf8")); }

// Sends exactly these bytes and returns the status line's number (or 0 if the helper just closed the connection)
function raw(port, text) {
  return new Promise(function (resolve, reject) {
    const sock = net.connect(port, "127.0.0.1", function () { sock.write(text); });
    let got = "";
    sock.on("data", function (c) { got += c; if (/\r\n/.test(got)) { sock.destroy(); } });
    sock.on("close", function () { const m = /^HTTP\/1\.\d (\d+)/.exec(got); resolve(m ? Number(m[1]) : 0); });
    sock.on("error", reject);
    setTimeout(function () { sock.destroy(); }, 3000);
  });
}

async function startHelper(root, kind) {
  const port = await freePort();
  const file = path.join(root, "apps", "server", kind === "py" ? "server.py" : "server.js");
  const child = kind === "py" ? spawn("python3", ["-B", file], { env: Object.assign({}, process.env, { TLOS_PORT: String(port), PYTHONDONTWRITEBYTECODE: "1" }) })
    : spawn(process.execPath, [file], { env: Object.assign({}, process.env, { TLOS_PORT: String(port), TLOS_AUTO_CLAUDE: "off" }) });
  let output = "";
  child.stdout.on("data", function (c) { output += c; });
  child.stderr.on("data", function (c) { output += c; });
  for (let i = 0; i < 50; i++) {
    await new Promise(function (r) { setTimeout(r, 100); });
    if (child.exitCode !== null) throw new Error("the helper stopped at once: " + output.trim());
    try { if ((await request(port, "GET", "/api/alive.js")).status === 200) return { child: child, port: port }; } catch (e) { /* not up yet */ }
  }
  child.kill();
  throw new Error("the helper did not start: " + output.trim());
}

// Loads apps/shared/js/store.js the way a page does (in a browser-like sandbox), talking to a real helper at `base`
function loadStore(base) {
  const window = {};
  const sandbox = {
    window: window, console: console, setInterval: function () { return 0; }, clearInterval: function () {},
    document: { visibilityState: "visible", addEventListener: function () {}, removeEventListener: function () {} },
    location: { protocol: "http:" },
    fetch: function (url, init) { return fetch(/^\//.test(url) ? base + url : url, init); }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(KIT, "apps", "shared", "js", "store.js"), "utf8"), sandbox);
  return window.TaskListOS.createStore;
}

async function runChecks(label, port, root, kind) {
  const file = path.join(root, "apps", "plain", "data", "plain.json");
  const url = "/api/data/plain/plain.json";
  const same = { Origin: "http://127.0.0.1:" + port };
  let passed = 0;
  async function check(name, fn) {
    try { await fn(); passed += 1; } catch (e) { console.error("FAILED (" + label + "): " + name + "\n  " + e.message); process.exitCode = 1; throw e; }
  }
  async function alive() { assert.strictEqual((await request(port, "GET", "/api/alive.js")).status, 200, "the helper stopped answering"); }
  const put = function (body, headers) { return request(port, "PUT", url, { type: "application/json", body: Buffer.from(body), headers: Object.assign({}, same, headers || {}) }); };
  const onDisk = function () { return JSON.parse(fs.readFileSync(file, "utf8")); };
  const etag = function (res) { return res.headers["etag"]; };

  // ---------- 1. Safety ----------
  await check("badly formed addresses get an error answer (never a 5xx) and the helper keeps running", async function () {
    const paths = ["/%", "/%zz", "/%E0%A4%A", "/%00", "/a%00b/", "/%c0%af", "/%ff%fe", "/a/%", "//%", "/api/%", "/api/data/%/x.json", "/api/media/plain/%",
      "/%2e%2e/%2e%2e/etc/passwd", "/..%2f..%2fserver%2fserver.js", "/%25", "/home/%"];
    for (const p of paths) {
      const res = await request(port, "GET", p);
      assert.ok(res.status >= 400 && res.status < 500, p + " should be a 4xx, was " + res.status);
      await alive();
    }
    for (const p of ["/%", "/%zz", "/%00", "/a/%"]) assert.strictEqual((await request(port, "GET", p)).status, 400, p + " should be 400");
    assert.strictEqual((await request(port, "HEAD", "/%")).status, 400);
  });
  await check("odd methods, hosts and origins are refused without trouble", async function () {
    for (const m of ["DELETE", "PATCH", "OPTIONS", "POST"]) {
      const res = await request(port, m, "/%", { headers: same });
      assert.ok(res.status >= 400 && res.status < 500, m + " /% was " + res.status);
    }
    assert.strictEqual((await request(port, "GET", "/%", { headers: { Host: "evil.example" } })).status, 403);
    assert.strictEqual((await request(port, "PUT", url, { type: "application/json", body: Buffer.from("{}"), headers: { Origin: "http://evil.example" } })).status, 403);
    await alive();
  });
  await check("a save with a body that is not valid is 400 (or another 4xx), never a stop, and the file is untouched", async function () {
    const before = fs.readFileSync(file, "utf8");
    const bodies = ["", "not json", "[1,2]", "null", "\"text\"", "{", "{\"a\":"];
    for (const b of bodies) {
      const res = await put(b);
      assert.ok(res.status >= 400 && res.status < 500, JSON.stringify(b) + " was " + res.status);
    }
    const bad = await request(port, "PUT", url, { type: "application/json", body: Buffer.from([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x3a, 0x31, 0x7d]), headers: same });
    assert.strictEqual(bad.status, 400);
    assert.strictEqual((await request(port, "PUT", url, { body: Buffer.from("{}"), headers: same })).status, 415);
    assert.strictEqual(fs.readFileSync(file, "utf8"), before);
    await alive();
  });
  await check("a Content-Length that is not a number or is negative is refused with a 4xx, and the helper keeps running", async function () {
    const base = "PUT " + url + " HTTP/1.1\r\nHost: 127.0.0.1:" + port + "\r\nContent-Type: application/json\r\n";
    for (const len of ["abc", "-5", "1e3", "99999999999999999999"]) {
      const status = await raw(port, base + "Content-Length: " + len + "\r\nConnection: close\r\n\r\n{}");
      assert.ok(status === 0 || (status >= 400 && status < 500), "Content-Length " + len + " was " + status);
      await alive();
    }
  });
  await check("a version that this helper never gave out is refused: 400", async function () {
    const before = fs.readFileSync(file, "utf8");
    for (const v of ["nonsense", "\"zzzz\"", "*x"]) {
      const res = await put('{"n":9}', { "If-Match": v });
      assert.strictEqual(res.status, 400, v + " was " + res.status);
    }
    assert.strictEqual(fs.readFileSync(file, "utf8"), before);
  });

  // ---------- 2. Lost updates ----------
  await check("a read gives a version (ETag), and it is the same every time while the file is the same", async function () {
    const a = await request(port, "GET", url), b = await request(port, "GET", url);
    assert.strictEqual(a.status, 200);
    assert.ok(/^"[0-9a-f]{24}"$/.test(etag(a)), "ETag was " + etag(a));
    assert.strictEqual(etag(a), etag(b));
  });
  await check("an older app that sends no version still saves (200)", async function () {
    const res = await put('{"n":1,"list":["a"]}');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(onDisk(), { n: 1, list: ["a"] });
  });
  await check("a save based on the current version works, and answers with the new version, which matches the next read", async function () {
    const read = await request(port, "GET", url);
    const res = await put('{"n":2,"list":["a","b"]}', { "If-Match": etag(read) });
    assert.strictEqual(res.status, 200);
    assert.ok(etag(res) && etag(res) !== etag(read));
    assert.strictEqual(json(res).version, etag(res).replace(/"/g, ""));
    assert.strictEqual(etag(await request(port, "GET", url)), etag(res));
    assert.deepStrictEqual(onDisk(), { n: 2, list: ["a", "b"] });
  });
  await check("a save based on an old version is refused: 409, and what Claude wrote is not overwritten", async function () {
    const read = await request(port, "GET", url);
    fs.writeFileSync(file, '{"n":3,"list":["a","b","from Claude"]}\n');     // Claude edits the file in between
    const res = await put('{"n":99,"list":["lost"]}', { "If-Match": etag(read) });
    assert.strictEqual(res.status, 409);
    assert.deepStrictEqual(onDisk(), { n: 3, list: ["a", "b", "from Claude"] });
    const again = await put('{"n":4,"list":["a","b","from Claude","mine"]}', { "If-Match": etag(await request(port, "GET", url)) });
    assert.strictEqual(again.status, 200);
  });
  await check("a save based on a file that has since gone is refused: 409", async function () {
    const read = await request(port, "GET", url);
    const kept = fs.readFileSync(file, "utf8");
    fs.unlinkSync(file);
    try { assert.strictEqual((await put('{"n":5}', { "If-Match": etag(read) })).status, 409); assert.ok(!fs.existsSync(file)); }
    finally { fs.writeFileSync(file, kept); }
  });
  await check("2 saves based on the same version: one is saved, the other is 409", async function () {
    const read = await request(port, "GET", url);
    const both = await Promise.all([put('{"n":10,"list":["one"]}', { "If-Match": etag(read) }), put('{"n":11,"list":["two"]}', { "If-Match": etag(read) })]);
    assert.deepStrictEqual(both.map(function (r) { return r.status; }).sort(), [200, 409]);
  });

  // ---------- store.js on top of it ----------
  const createStore = loadStore("http://127.0.0.1:" + port);
  function makeStore(extra) {
    const events = { statuses: [], saves: 0 };
    const store = createStore(Object.assign({
      moduleId: "plain", fileName: "plain.json", api: url, onData: function (d, why) { if (why === "save") events.saves += 1; },
      onStatus: function (s, detail) { events.statuses.push([s, detail && detail.error && detail.error.kind]); }
    }, extra || {}));
    return { store: store, events: events };
  }
  await check("store.js: a normal change is saved", async function () {
    fs.writeFileSync(file, '{"n":0,"list":[]}\n');
    const t = makeStore(); await t.store.start();
    await t.store.update(function (d) { d.list.push("x"); d.n += 1; });
    assert.deepStrictEqual(onDisk(), { n: 1, list: ["x"] });
  });
  await check("store.js: a file changed in between (Claude wrote) is not lost: it re-reads, makes the same change again and saves", async function () {
    fs.writeFileSync(file, '{"n":0,"list":[]}\n');
    const t = makeStore(); await t.store.start();
    let calls = 0;
    await t.store.update(function (d) {
      calls += 1;
      if (calls === 1) fs.writeFileSync(file, '{"n":0,"list":["from Claude"]}\n');   // happens after store.js read, before it saves
      d.list.push("mine"); d.n += 1;
    });
    assert.strictEqual(calls, 2);
    assert.deepStrictEqual(onDisk(), { n: 1, list: ["from Claude", "mine"] });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(t.store.getData())), { n: 1, list: ["from Claude", "mine"] });   // (copied: it was made inside the page sandbox)
  });
  await check("store.js: it tries again twice, and the third change that lands in between is still saved", async function () {
    fs.writeFileSync(file, '{"n":0,"list":[]}\n');
    const t = makeStore(); await t.store.start();
    let calls = 0;
    await t.store.update(function (d) {
      calls += 1;
      if (calls <= 2) fs.writeFileSync(file, JSON.stringify({ n: 0, list: ["c" + calls] }) + "\n");
      d.list.push("mine");
    });
    assert.strictEqual(calls, 3);
    assert.deepStrictEqual(onDisk().list, ["c2", "mine"]);
  });
  await check("store.js: if the file keeps changing it gives up with a plain error and never overwrites", async function () {
    fs.writeFileSync(file, '{"n":0,"list":[]}\n');
    const t = makeStore(); await t.store.start();
    let calls = 0;
    await assert.rejects(t.store.update(function (d) {
      calls += 1;
      fs.writeFileSync(file, JSON.stringify({ n: calls, list: ["claude" + calls] }) + "\n");
      d.list.push("mine");
    }), function (err) { return err.kind === "save-failed"; });
    assert.strictEqual(calls, 3);
    assert.deepStrictEqual(onDisk(), { n: 3, list: ["claude3"] });
  });
  await check("store.js: saves queued behind each other all land", async function () {
    fs.writeFileSync(file, '{"n":0,"list":[]}\n');
    const t = makeStore(); await t.store.start();
    await Promise.all([1, 2, 3, 4, 5].map(function (i) { return t.store.update(function (d) { d.list.push(i); d.n += 1; }); }));
    assert.deepStrictEqual(onDisk(), { n: 5, list: [1, 2, 3, 4, 5] });
  });

  console.log(label + ": " + passed + " checks passed");
}

// An older helper: no versions at all. store.js must still save, once, with no retry loop.
async function checkOldHelper() {
  let stored = '{"n":0,"list":[]}\n', puts = 0, sawIfMatch = false;
  const server = http.createServer(function (req, res) {
    if (req.method === "GET" && /\/meta$/.test(req.url)) { res.setHeader("Content-Type", "application/json"); return res.end('{"modified":1}'); }
    if (req.method === "GET") { res.setHeader("Content-Type", "application/json"); res.setHeader("X-Modified", "1"); return res.end(stored); }
    if (req.method === "PUT") {
      puts += 1; if (req.headers["if-match"]) sawIfMatch = true;
      let body = ""; req.on("data", function (c) { body += c; });
      return req.on("end", function () { stored = body; res.setHeader("Content-Type", "application/json"); res.end('{"modified":2}'); });
    }
    res.statusCode = 405; res.end();
  });
  await new Promise(function (resolve, reject) { server.on("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const createStore = loadStore("http://127.0.0.1:" + server.address().port);
    const store = createStore({ moduleId: "plain", fileName: "plain.json", api: "/api/data/plain/plain.json", onData: function () {}, onStatus: function () {} });
    await store.start();
    await store.update(function (d) { d.list.push("x"); });
    assert.strictEqual(puts, 1);
    assert.strictEqual(sawIfMatch, false, "no version should be sent when the helper gave none");
    assert.deepStrictEqual(JSON.parse(stored), { n: 0, list: ["x"] });
    console.log("Older helper (no versions): store.js saves once, 1 check passed");
  } catch (e) { console.error("FAILED (older helper without versions)\n  " + e.message); process.exitCode = 1; throw e; }
  finally { server.close(); }
}

async function runOne(kind) {
  const root = scratchCopy();
  let helper = null;
  try {
    helper = await startHelper(root, kind);
    await runChecks(kind === "py" ? "Python helper" : "Node helper", helper.port, root, kind);
  } finally {
    if (helper) helper.child.kill();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

(async function main() {
  const want = process.argv[2] || "both";
  const hasPython = spawnSync("python3", ["--version"]).status === 0;
  const kinds = want === "js" ? ["js"] : want === "py" ? ["py"] : hasPython ? ["js", "py"] : ["js"];
  if (want === "both" && !hasPython) console.log("python3 isn't installed here, so only the Node helper is checked.");
  for (const kind of kinds) {
    try { await runOne(kind); } catch (e) {
      if (e && (e.code === "EPERM" || e.code === "EACCES" || e.code === "ENOENT")) { console.error("COULD NOT RUN (" + kind + "): " + e.message); process.exitCode = 2; return; }
      if (!process.exitCode) process.exitCode = 1;
      if (!/^FAILED/.test(String(e && e.message))) console.error("ERROR (" + kind + "): " + (e && e.message));
    }
  }
  try { await checkOldHelper(); } catch (e) {
    if (e && (e.code === "EPERM" || e.code === "EACCES")) { console.error("COULD NOT RUN (older helper): " + e.message); process.exitCode = 2; return; }
    if (!process.exitCode) process.exitCode = 1;
  }
})();
