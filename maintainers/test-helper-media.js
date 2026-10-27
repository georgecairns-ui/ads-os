/*
  Checks the helper's photo and video routes (PUT and GET /api/media/<tool>/<name>) over real http requests.
  Run: node maintainers/test-helper-media.js           (the Node helper, and the Python one if python3 is there)
       node maintainers/test-helper-media.js js        (only apps/server/server.js)
       node maintainers/test-helper-media.js py        (only apps/server/server.py)

  It works on a scratch copy of the helper in a temporary folder, so nothing is ever written into the kit.
  The scratch copy lists 2 tools: "content" (marked "media": true) and "plain" (not marked). It starts the
  helper on a free port (TLOS_PORT), so it needs to be allowed to open a local port. If it isn't, this prints
  "COULD NOT RUN" and exits with 2 instead of passing. Exits 1 if any check fails.
*/
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const KIT = path.join(__dirname, "..");
const MAX = 200 * 1024 * 1024;

function freePort() {
  return new Promise(function (resolve, reject) {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", function () { const port = probe.address().port; probe.close(function () { resolve(port); }); });
  });
}

// A scratch copy of the helper with 2 tools listed, in a new temporary folder
function scratchCopy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "helper-media-test-"));
  fs.mkdirSync(path.join(root, "apps", "server"), { recursive: true });
  ["server.js", "server.py"].forEach(function (f) { fs.copyFileSync(path.join(KIT, "apps", "server", f), path.join(root, "apps", "server", f)); });
  fs.mkdirSync(path.join(root, "apps", "content", "data"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "plain", "data"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "installed.json"), JSON.stringify({ tools: [
    { id: "content", name: "Content", app: "apps/content/", media: true, dataFiles: ["apps/content/data/content.json"] },
    { id: "plain", name: "Plain", app: "apps/plain/", dataFiles: ["apps/plain/data/plain.json"] }
  ] }));
  return root;
}

function request(port, method, urlPath, options) {
  const o = options || {};
  return new Promise(function (resolve, reject) {
    const headers = Object.assign({}, o.headers || {});
    if (o.type) headers["Content-Type"] = o.type;
    if (o.body && !headers["Content-Length"] && !o.chunked) headers["Content-Length"] = o.body.length;
    const req = http.request({ host: "127.0.0.1", port: port, method: method, path: urlPath, headers: headers, agent: false }, function (res) {
      const chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
        if (o.leaveOpen) req.destroy();
      });
    });
    req.on("error", reject);
    if (o.body) req.write(o.body);
    if (o.leaveOpen) return;      // for a request that is refused before its body is sent
    req.end();
  });
}
function json(res) { return JSON.parse(res.body.toString("utf8")); }

function bytes(n) { const b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = i % 251; return b; }

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

async function runChecks(label, port, root) {
  const dir = path.join(root, "apps", "content", "data", "media");
  const same = { Origin: "http://127.0.0.1:" + port };
  let passed = 0;
  async function check(name, fn) {
    try { await fn(); passed += 1; } catch (e) { console.error("FAILED (" + label + "): " + name + "\n  " + e.message); process.exitCode = 1; throw e; }
  }

  const jpg = bytes(300), video = bytes(1000);

  await check("a photo is saved: 201 with its file name, and the same bytes are on disk", async function () {
    assert.ok(!fs.existsSync(dir), "the media folder should not exist until the first upload");
    const res = await request(port, "PUT", "/api/media/content/m-k3x9q2.jpg", { type: "image/jpeg", body: jpg, headers: same });
    assert.strictEqual(res.status, 201);
    assert.deepStrictEqual(json(res), { file: "m-k3x9q2.jpg" });
    assert.ok(fs.readFileSync(path.join(dir, "m-k3x9q2.jpg")).equals(jpg));
    assert.deepStrictEqual(fs.readdirSync(dir), ["m-k3x9q2.jpg"]);     // no temporary file left behind
  });
  await check("the photo plays back with the right type", async function () {
    const res = await request(port, "GET", "/api/media/content/m-k3x9q2.jpg");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers["content-type"], "image/jpeg");
    assert.strictEqual(res.headers["accept-ranges"], "bytes");
    assert.ok(res.body.equals(jpg));
    assert.strictEqual((await request(port, "HEAD", "/api/media/content/m-k3x9q2.jpg")).status, 200);
  });
  await check("a content type with a parameter is fine, and .jpeg, .mov and .webm are accepted", async function () {
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-b.jpeg", { type: "Image/JPEG; charset=binary", body: jpg })).status, 201);
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-c.mov", { type: "video/quicktime", body: video })).status, 201);
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-d.webm", { type: "video/webm", body: video })).status, 201);
    assert.strictEqual((await request(port, "GET", "/api/media/content/m-c.mov")).headers["content-type"], "video/quicktime");
  });
  await check("a video answers Range requests with 206", async function () {
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-v1.mp4", { type: "video/mp4", body: video })).status, 201);
    const mid = await request(port, "GET", "/api/media/content/m-v1.mp4", { headers: { Range: "bytes=10-19" } });
    assert.strictEqual(mid.status, 206);
    assert.strictEqual(mid.headers["content-range"], "bytes 10-19/1000");
    assert.strictEqual(mid.headers["content-length"], "10");
    assert.ok(mid.body.equals(video.subarray(10, 20)));
    const open = await request(port, "GET", "/api/media/content/m-v1.mp4", { headers: { Range: "bytes=990-" } });
    assert.strictEqual(open.headers["content-range"], "bytes 990-999/1000");
    assert.ok(open.body.equals(video.subarray(990)));
    const tail = await request(port, "GET", "/api/media/content/m-v1.mp4", { headers: { Range: "bytes=-5" } });
    assert.strictEqual(tail.status, 206);
    assert.ok(tail.body.equals(video.subarray(995)));
    const past = await request(port, "GET", "/api/media/content/m-v1.mp4", { headers: { Range: "bytes=5000-" } });
    assert.strictEqual(past.status, 416);
    assert.strictEqual(past.headers["content-range"], "bytes */1000");
    const whole = await request(port, "GET", "/api/media/content/m-v1.mp4");
    assert.strictEqual(whole.status, 200);
    assert.ok(whole.body.equals(video));
  });
  await check("a file that is already there is never overwritten: 409", async function () {
    const res = await request(port, "PUT", "/api/media/content/m-k3x9q2.jpg", { type: "image/jpeg", body: bytes(50) });
    assert.strictEqual(res.status, 409);
    assert.ok(fs.readFileSync(path.join(dir, "m-k3x9q2.jpg")).equals(jpg));
  });
  await check("too big by its header: 413, and nothing is written", async function () {
    const before = fs.readdirSync(dir).sort();
    const res = await request(port, "PUT", "/api/media/content/m-big.mp4", { type: "video/mp4", body: bytes(10), headers: { "Content-Length": String(MAX + 1) }, leaveOpen: true });
    assert.strictEqual(res.status, 413);
    assert.deepStrictEqual(fs.readdirSync(dir).sort(), before);
  });
  await check("names that aren't allowed are refused: 400", async function () {
    const names = ["Bad.jpg", "photo.exe", "-start.jpg", "no-ending", "a%2Fb.jpg", "..%2Fx.jpg", "m-" + "a".repeat(70) + ".jpg", "m-x.JPG", "m-x.svg", "m-x.jpg.html"];
    for (const name of names) {
      const res = await request(port, "PUT", "/api/media/content/" + name, { type: "image/jpeg", body: jpg });
      assert.strictEqual(res.status, 400, name + " should be 400, was " + res.status);
      assert.strictEqual((await request(port, "GET", "/api/media/content/" + name)).status, 400, name + " (GET)");
    }
    assert.deepStrictEqual(fs.readdirSync(dir).filter(function (f) { return /^(Bad|photo|-start|no-ending)/.test(f); }), []);
  });
  await check("the wrong kind of file for its ending is refused: 415", async function () {
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-e.jpg", { type: "image/png", body: jpg })).status, 415);
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-e.mp4", { type: "image/jpeg", body: jpg })).status, 415);
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-e.jpg", { type: "application/octet-stream", body: jpg })).status, 415);
    assert.strictEqual((await request(port, "PUT", "/api/media/content/m-e.jpg", { body: jpg })).status, 415);
    assert.ok(!fs.existsSync(path.join(dir, "m-e.jpg")));
  });
  await check("a tool that isn't marked media, or isn't installed, is refused: 404", async function () {
    assert.strictEqual((await request(port, "PUT", "/api/media/plain/m-a.jpg", { type: "image/jpeg", body: jpg })).status, 404);
    assert.strictEqual((await request(port, "PUT", "/api/media/nothere/m-a.jpg", { type: "image/jpeg", body: jpg })).status, 404);
    assert.strictEqual((await request(port, "GET", "/api/media/plain/m-a.jpg")).status, 404);
    assert.ok(!fs.existsSync(path.join(root, "apps", "plain", "data", "media")));
  });
  await check("another website, or another address, is refused", async function () {
    const evil = await request(port, "PUT", "/api/media/content/m-f.jpg", { type: "image/jpeg", body: jpg, headers: { Origin: "http://evil.example" } });
    assert.strictEqual(evil.status, 403);
    assert.ok(!fs.existsSync(path.join(dir, "m-f.jpg")));
    const host = await request(port, "GET", "/api/media/content/m-k3x9q2.jpg", { headers: { Host: "evil.example" } });
    assert.strictEqual(host.status, 403);
  });
  await check("a request with no length is refused: 411", async function () {
    const res = await request(port, "PUT", "/api/media/content/m-g.jpg", { type: "image/jpeg", body: jpg, chunked: true });
    assert.strictEqual(res.status, 411);
    assert.ok(!fs.existsSync(path.join(dir, "m-g.jpg")));
  });
  await check("a file that is not there is a 404, and there is no way to delete or change one", async function () {
    assert.strictEqual((await request(port, "GET", "/api/media/content/m-nothing.jpg")).status, 404);
    assert.strictEqual((await request(port, "DELETE", "/api/media/content/m-k3x9q2.jpg")).status, 405);
    assert.strictEqual((await request(port, "POST", "/api/media/content/m-k3x9q2.jpg", { type: "application/json", body: Buffer.from("{}") })).status, 405);
    assert.strictEqual((await request(port, "PATCH", "/api/media/content/m-k3x9q2.jpg")).status, 405);
    assert.ok(fs.existsSync(path.join(dir, "m-k3x9q2.jpg")));
  });
  await check("the data file still saves as before, and no temporary file is left in the media folder", async function () {
    const res = await request(port, "PUT", "/api/data/content/content.json", { type: "application/json", body: Buffer.from('{"posts":[]}') });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(fs.readdirSync(dir).filter(function (f) { return /\.saving$/.test(f); }), []);
  });
  console.log(label + ": " + passed + " checks passed");
}

async function runOne(kind) {
  const root = scratchCopy();
  let helper = null;
  try {
    helper = await startHelper(root, kind);
    await runChecks(kind === "py" ? "Python helper" : "Node helper", helper.port, root);
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
})();
