/*
  Checks apps/shared/js/connections.js, the shared rules for apps/home/data/connections.json (shared version 13).
  Run: node maintainers/test-connections.js        Exits 1 if any check fails.
*/
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { window: {}, console: console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "apps", "shared", "js", "connections.js"), "utf8"), sandbox);
const C = sandbox.window.TaskListOS.connections;

let passed = 0;
function check(name, fn) {
  try { fn(); passed += 1; } catch (e) { console.error("FAILED: " + name + "\n  " + e.message); process.exitCode = 1; }
}
const file = function (connections) { return { version: 1, connections: connections }; };

check("an empty file is valid", function () { assert.ok(C.validate(file({}))); });
check("the 6 statuses are the only ones", function () {
  assert.deepStrictEqual(Object.keys(C.STATUS).sort(), ["connected", "export-only", "needs-attention", "no-connector", "not-connected", "not-used"]);
});
check("an unknown status is refused", function () {
  assert.throws(function () { C.validate(file({ gmail: { name: "Gmail", status: "maybe" } })); }, /unknown status/);
});
check("connected without a checked date is refused", function () {
  assert.throws(function () { C.validate(file({ gmail: { name: "Gmail", status: "connected", checked: "" } })); }, /no date/);
});
check("connected with a checked date is fine", function () {
  assert.ok(C.validate(file({ gmail: { name: "Gmail", status: "connected", checked: "2026-10-28" } })));
});
check("a file without connections is refused", function () {
  assert.throws(function () { C.validate({ version: 1 }); }, /connections/);
});
check("list puts needs-attention first, then connected, then the rest, and uses the name", function () {
  const d = file({
    xero: { name: "Xero", status: "connected", checked: "2026-10-28" },
    sage: { name: "Sage", status: "export-only" },
    hubspot: { name: "HubSpot", status: "needs-attention" }
  });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.list(d).map(function (x) { return x.name; }))), ["HubSpot", "Xero", "Sage"]);
});
check("an entry with no name gets one from its key", function () {
  assert.strictEqual(C.list(file({ "my-booking-system": { status: "no-connector" } }))[0].name, "My booking system");
});
check("counts include only connected and needs-attention", function () {
  const d = file({
    a: { name: "A", status: "connected", checked: "2026-10-28" },
    b: { name: "B", status: "needs-attention" },
    c: { name: "C", status: "not-used" },
    d: { name: "D", status: "export-only" },
    e: { name: "E", status: "no-connector" },
    f: { name: "F", status: "not-connected" }
  });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.counts(d))), { connected: 1, attention: 1, total: 2 });
});
check("the fix prompt names the app, the skill and the file", function () {
  const p = C.fixPrompt("Xero");
  assert.ok(/Xero/.test(p) && /connect-a-tool/.test(p) && /apps\/home\/data\/connections\.json/.test(p));
});

console.log(passed + " connections checks passed");
