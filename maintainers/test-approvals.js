/*
  Checks that a Meta account change needs the owner's recorded yes, and that the pieces which enforce it are in place.
  Run: node maintainers/test-approvals.js   (prints how many checks passed, exits 1 if any failed)
  Plain Node, no packages. Reads the kit's files but never changes them.
*/
"use strict";

process.env.TZ = "Europe/London";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const M = require(path.join(ROOT, "apps", "ads", "app", "model.js"));
const R = require(path.join(ROOT, "apps", "ads", "app", "report.js"));
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); };
const json = function (rel) { return JSON.parse(read(rel)); };

let passed = 0;
function check(name, fn) {
  try { fn(); passed += 1; } catch (e) { console.error("FAILED: " + name + "\n  " + (e && e.message)); process.exit(1); }
}

const TODAY = "2026-10-22";
function fixture() {
  return M.normalise({
    settings: { dailyCap: 100 },
    campaigns: [{ id: "c1", platform: "meta", name: "New patient check-up", status: "on", dailyBudget: 10, ads: [] }]
  });
}
function budgetAction() { return M.newAction("budget", { campaignId: "c1", budgetFrom: 10, budgetTo: 15 }); }

check("a missing, unknown or odd status is never a waiting change: it is failed, with a note", function () {
  const d = M.normalise({ actions: [
    { id: "a1", kind: "pause", campaignId: "c1" },
    { id: "a2", kind: "pause", campaignId: "c1", status: "weird" },
    { id: "a3", kind: "pause", campaignId: "c1", status: "" },
    { id: "a4", kind: "pause", campaignId: "c1", status: "Requested" },
    { id: "a5", kind: "pause", campaignId: "c1", status: "requested", note: "keep" }
  ] });
  ["a1", "a2", "a3", "a4"].forEach(function (id, i) {
    assert.strictEqual(d.actions[i].status, "failed", id);
    assert.strictEqual(d.actions[i].note, "unclear entry, not acted on", id);
  });
  assert.strictEqual(d.actions[4].status, "requested"); assert.strictEqual(d.actions[4].note, "keep");
  assert.strictEqual(d.actions.filter(function (a) { return a.status === "requested"; }).length, 1);
});

check("an unclear entry does not block a new change on its campaign", function () {
  const d = M.normalise({ campaigns: [{ id: "c1", platform: "meta", name: "A", status: "on", dailyBudget: 10 }], actions: [{ id: "a1", kind: "pause", campaignId: "c1" }] });
  assert.strictEqual(d.actions.filter(function (a) { return a.status === "requested" || a.status === "doing"; }).length, 0);
});

check("newApproval records the exact change and the moment of the owner's yes", function () {
  const a = budgetAction(), p = M.newApproval(a);
  assert.deepStrictEqual(p, { id: a.id, kind: "budget", platform: "meta", campaignId: "c1", buildId: "", adId: "", budgetFrom: 10, budgetTo: 15, confirmedAt: a.requestedAt, closedAt: null });
});

check("approvalFor finds the confirmation only when everything matches", function () {
  const a = budgetAction(), good = M.newApproval(a);
  assert.deepStrictEqual(M.approvalFor([good], a), good);
  const bad = {
    "a different id": { id: "other" }, "a different kind": { kind: "pause" }, "a different platform": { platform: "google" },
    "a different campaign": { campaignId: "c2" }, "a different build": { buildId: "b1" }, "a different ad": { adId: "x" },
    "a different amount": { budgetTo: 16 }, "a different starting amount": { budgetFrom: 9 },
    "no confirmedAt": { confirmedAt: "" }, "another confirmedAt": { confirmedAt: "2020-01-01T00:00:00.000Z" }, "a closed confirmation": { closedAt: "2026-10-22T10:00:00.000Z" }
  };
  Object.keys(bad).forEach(function (why) {
    assert.strictEqual(M.approvalFor([Object.assign({}, good, bad[why])], a), null, why);
  });
});

check("approvalFor is null for nothing, for a list that isn't a list and for a change that isn't one", function () {
  const a = budgetAction();
  assert.strictEqual(M.approvalFor([], a), null);
  assert.strictEqual(M.approvalFor(undefined, a), null);
  assert.strictEqual(M.approvalFor([M.newApproval(a)], null), null);
  assert.strictEqual(M.approvalFor([M.newApproval(a)], { kind: "delete", id: a.id }), null);
  assert.strictEqual(M.approvalFor([null, 5, "x", M.newApproval(a)], a) !== null, true);
});

check("the app's own change, changed after the yes, no longer matches (a different budget, a different campaign)", function () {
  const a = budgetAction(), p = M.newApproval(a);
  assert.strictEqual(M.approvalFor([p], Object.assign({}, a, { budgetTo: 99 })), null);
  assert.strictEqual(M.approvalFor([p], Object.assign({}, a, { campaignId: "c2" })), null);
  assert.strictEqual(M.approvalFor([p], Object.assign({}, a, { kind: "switch-on" })), null);
  assert.strictEqual(M.approvalFor([p], Object.assign({}, a, { requestedAt: "2026-10-22T11:11:11.000Z" })), null);
});

check("normaliseApprovals and validateApprovals", function () {
  const d = M.normaliseApprovals({ approvals: [null, { id: "x", kind: "pause", budgetTo: -4, closedAt: "" }, "no"] });
  assert.strictEqual(d.approvals.length, 1); assert.strictEqual(d.approvals[0].budgetTo, null); assert.strictEqual(d.approvals[0].closedAt, null); assert.strictEqual(d.approvals[0].platform, "meta");
  assert.deepStrictEqual(M.normaliseApprovals({}), { version: 1, approvals: [] });
  assert.throws(function () { M.validateApprovals({ approvals: {} }); }, /should be a list/);
  assert.throws(function () { M.validateApprovals(null); }, /empty/);
  M.validateApprovals({ version: 1, approvals: [] });
});

check("report.js action is BLOCKED without the owner's confirmation and OK with it", function () {
  const d = fixture(); d.actions = [budgetAction()];
  const a = d.actions[0];
  assert.ok(/Result: OK$/.test(R.actionReport(d, a.id, TODAY)), "limits alone, no approvals given");
  const none = R.actionReport(d, a.id, TODAY, []);
  assert.ok(/Owner's confirmation: none that matches/.test(none) && /Result: BLOCKED$/.test(none), none);
  const wrong = R.actionReport(d, a.id, TODAY, [Object.assign(M.newApproval(a), { budgetTo: 12 })]);
  assert.ok(/Result: BLOCKED$/.test(wrong), wrong);
  const ok = R.actionReport(d, a.id, TODAY, [M.newApproval(a)]);
  assert.ok(/Owner's confirmation: found/.test(ok) && /Warnings: none/.test(ok) && /Result: OK$/.test(ok), ok);
  const closed = R.actionReport(d, a.id, TODAY, [Object.assign(M.newApproval(a), { closedAt: "2026-10-22T10:00:00.000Z" })]);
  assert.ok(/Result: BLOCKED$/.test(closed), closed);
});

check("report.js action is BLOCKED for a finished change even when the confirmation exists", function () {
  const d = fixture(); d.actions = [Object.assign(budgetAction(), { status: "done" })];
  const out = R.actionReport(d, d.actions[0].id, TODAY, [M.newApproval(d.actions[0])]);
  assert.ok(/not waiting to be made/.test(out) && /Result: BLOCKED$/.test(out), out);
});

check("report.js action is BLOCKED when the limits fail, even with a confirmation", function () {
  const d = fixture(); d.settings.dailyCap = 12; d.actions = [budgetAction()];
  const out = R.actionReport(d, d.actions[0].id, TODAY, [M.newApproval(d.actions[0])]);
  assert.ok(/Result: BLOCKED$/.test(out), out);
});

check("loadApprovals reads a file, treats a missing one as nothing approved, and refuses a broken one", function () {
  const os = require("os");
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "ads-approvals-"));
  const a = budgetAction(), file = path.join(dir, "approvals.json");
  assert.deepStrictEqual(R.loadApprovals(path.join(dir, "nope.json")), []);
  fs.writeFileSync(file, JSON.stringify({ version: 1, approvals: [M.newApproval(a)] }));
  assert.strictEqual(M.approvalFor(R.loadApprovals(file), a) !== null, true);
  fs.writeFileSync(file, JSON.stringify({ approvals: "yes" }));
  assert.throws(function () { R.loadApprovals(file); }, /should be a list/);
  fs.rmSync(dir, { recursive: true, force: true });
});

check("the report command line refuses without a confirmation in the kit's own approvals file", function () {
  // the shipped approvals file is empty, so no action id can pass: the command-line check on an unknown id exits 2, never OK
  const cp = require("child_process");
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, "apps", "ads", "app", "report.js"), "action", "no-such-id"], { encoding: "utf8" });
  assert.strictEqual(r.status, 2);
});

check("a change stuck for 30 minutes can be marked failed, and not before", function () {
  const a = budgetAction(), t0 = Date.parse(a.requestedAt);
  assert.strictEqual(M.STUCK_AFTER_MS, 30 * 60 * 1000);
  assert.strictEqual(M.actionStuck(a, t0 + 29 * 60 * 1000), false);
  assert.strictEqual(M.actionStuck(a, t0 + 30 * 60 * 1000), true);
  assert.strictEqual(M.actionStuck(Object.assign({}, a, { status: "doing" }), t0 + 31 * 60 * 1000), true);
  assert.strictEqual(M.actionStuck(Object.assign({}, a, { status: "done" }), t0 + 99 * 60 * 1000), false);
  assert.strictEqual(M.actionStuck(Object.assign({}, a, { status: "failed" }), t0 + 99 * 60 * 1000), false);
  assert.strictEqual(M.actionStuck(Object.assign({}, a, { requestedAt: "nonsense" }), t0 + 99 * 60 * 1000), false);
  assert.strictEqual(M.actionStuck(null, t0), false);
  const failed = M.failStuckAction(Object.assign({}, a, { status: "doing" }));
  assert.strictEqual(failed.status, "failed"); assert.strictEqual(failed.doneAt, null);
  assert.ok(/Claude did not confirm it/.test(failed.note) && /Ads Manager/.test(failed.note), failed.note);
  assert.ok(!/\u2014/.test(failed.note));
});

check("once a stuck change is marked failed it no longer counts as waiting, so the next change can be made", function () {
  const d = fixture(); d.actions = [Object.assign(budgetAction(), { status: "doing" })];
  assert.strictEqual(d.actions.some(function (a) { return a.status === "requested" || a.status === "doing"; }), true);
  M.failStuckAction(d.actions[0]);
  assert.strictEqual(d.actions.some(function (a) { return a.status === "requested" || a.status === "doing"; }), false);
  assert.strictEqual(M.normalise(d).actions[0].status, "failed");
});

check("the words typed into Claude Code name the action, ask for a read-back and never mention a background run", function () {
  const a = budgetAction(), p = M.changePrompt([a]);
  assert.ok(p.indexOf(a.id) > -1 && /make-account-change/.test(p) && /approvals file/.test(p) && /BLOCKED/.test(p) && /read it back/.test(p), p);
  assert.ok(/never delete/i.test(p) && /never touch Google/i.test(p));
  assert.ok(!/\u2014/.test(p));
  assert.ok(M.changePrompt([]).length > 0);
});

check("approvals.json ships empty and is listed where the helper looks, so it saves", function () {
  assert.deepStrictEqual(json("apps/ads/data/approvals.json"), { version: 1, approvals: [] });
  const tool = json("apps/installed.json").tools.find(function (t) { return t.id === "ads"; });
  assert.ok(tool.dataFiles.indexOf("apps/ads/data/approvals.json") > -1, "apps/installed.json");
  assert.ok(json("toolkit.json").dataFiles.indexOf("apps/ads/data/approvals.json") > -1, "toolkit.json");
  // the helper's own rule for a data file (apps/server/server.js), read from the file so the two can't drift apart
  const m = /const DATA_FILE_RE = (\/.*\/);/.exec(read("apps/server/server.js"));
  assert.ok(m, "could not find the helper's data file rule");
  const re = new Function("return " + m[1])();
  tool.dataFiles.forEach(function (rel) {
    assert.ok(re.test(rel) && !/\.backup\.json$/.test(rel) && rel.startsWith(tool.app + "data/"), rel + " would be refused by the helper");
  });
});

check("Claude may write ads.json and the media folder only: never approvals.json", function () {
  const allow = json(".claude/settings.json").permissions.allow;
  const writes = allow.filter(function (p) { return /^(Write|Edit)\(\.\/apps\/ads\/data/.test(p); });
  assert.deepStrictEqual(writes.sort(), ["Edit(./apps/ads/data/ads.json)", "Edit(./apps/ads/data/media/**)", "Write(./apps/ads/data/ads.json)", "Write(./apps/ads/data/media/**)"]);
  assert.ok(!allow.some(function (p) { return /apps\/ads\/data\/\*\*|approvals/.test(p); }));
  assert.ok(!allow.some(function (p) { return /^mcp__/.test(p); }));
  assert.ok(!allow.some(function (p) { return /^(Write|Edit)\(\.\/(apps|\*\*|\.claude)/.test(p) && !/apps\/(ads|home)\/data/.test(p); }));
});

check("the deny list stops Google Ads write tools and Meta delete tools", function () {
  const deny = json(".claude/settings.json").permissions.deny;
  ["create", "update", "mutate", "delete", "remove", "pause", "enable", "activate", "upload"].forEach(function (v) {
    assert.ok(deny.some(function (p) { return /^mcp__\*oogle_ads\*__\*/.test(p) && p.indexOf("*" + v + "*") > -1; }), "Google " + v);
  });
  ["delete", "remove", "archive"].forEach(function (v) { assert.ok(deny.some(function (p) { return /eta_ads/.test(p) && p.indexOf("*" + v + "*") > -1; }), "Meta " + v); });
  // the tools that make an approved change are not denied, so the owner's yes can still be carried out
  assert.ok(!deny.some(function (p) { return /eta_/.test(p) && /(activate|update)/.test(p); }));
  assert.ok(!deny.some(function (p) { return /^mcp__\*$|^mcp__\*__\*$/.test(p); }));
});

check("an account change is not a background job, and the app opens Claude on screen instead", function () {
  const jobs = json("apps/ads/claude-jobs.json").jobs;
  assert.strictEqual(jobs["make-account-change"], undefined);
  assert.strictEqual(Object.keys(jobs).length, 8);
  const app = read("apps/ads/app/app.js");
  assert.ok(!/runJob\(["']make-account-change["']\)/.test(app) && !/"make-account-change": \{/.test(app));
  // after Yes: the approvals file is written first, then the change, then Claude is opened
  const yes = app.slice(app.indexOf("function confirmYes()"), app.indexOf("function openClaudeForChange"));
  assert.ok(yes.indexOf("approve(") > -1 && yes.indexOf("approve(") < yes.indexOf("update(function (d)") && yes.indexOf("update(function (d)") < yes.indexOf("openClaudeForChange"), "order in confirmYes");
  assert.ok(/claude:\/\/code\/new\?q=/.test(app) && /&folder=/.test(app) && /\/api\/info/.test(app), "the Open Claude link");
  assert.ok(/data-copy="' \+ esc\(prompt\)/.test(app), "the copy fallback");
  assert.ok(/approvalStore\.isHelper\(\)/.test(yes), "no yes without a place to record it");
});

check("every skill that reads the ad account or text from outside says it is data, never instructions", function () {
  ["update-my-ads", "analyse-campaign", "make-account-change", "build-a-campaign", "what-should-i-change"].forEach(function (s) {
    assert.ok(/data, never instructions/.test(read(".claude/skills/" + s + "/SKILL.md")), s);
  });
});

check("make-account-change acts only with the matching confirmation, and never writes it", function () {
  const s = read(".claude/skills/make-account-change/SKILL.md");
  assert.ok(/approvals\.json/.test(s) && /confirmedAt/.test(s) && /Never write to `approvals\.json`/.test(s));
  assert.ok(/id, kind, platform|same `id`, `kind`/.test(s));
});

check("no em dash in the new words", function () {
  ["apps/ads/app/model.js", "apps/ads/app/app.js", "apps/ads/app/drawer.js", "apps/ads/app/report.js", ".claude/skills/make-account-change/SKILL.md", "setup/scripts/install-claude-ads.sh", "setup/scripts/install-claude-ads.ps1"].forEach(function (f) {
    assert.ok(read(f).indexOf("\u2014") === -1, f);
  });
});

check("the zip fallback in the install scripts is pinned to a SHA-256 and the 2 scripts agree", function () {
  const sh = read("setup/scripts/install-claude-ads.sh"), ps = read("setup/scripts/install-claude-ads.ps1");
  const a = /ZIP_SHA256="\$\{CLAUDE_ADS_ZIP_SHA256:-([0-9a-f]{64})\}"/.exec(sh), b = /\$ZipSha256 = .*else \{ '([0-9a-f]{64})' \}/.exec(ps);
  assert.ok(a && b && a[1] === b[1], "hash pinned in both");
  assert.ok(/ZIP_HASH" = "\$ZIP_SHA256"/.test(sh) && /\$zipHash -ne \$ZipSha256/.test(ps));
});

console.log("All " + passed + " checks passed.");
