/*
  Checks the rules in apps/ads/app/model.js, and what apps/ads/app/report.js prints, with plain Node assertions.
  Run: node maintainers/test-model.js   (prints how many checks passed, exits 1 if any failed)
  The fixture is built here, so the kit's own data file is never touched.
*/
"use strict";

process.env.TZ = "Europe/London";

const assert = require("assert");
const path = require("path");
const M = require(path.join(__dirname, "..", "apps", "ads", "app", "model.js"));
const R = require(path.join(__dirname, "..", "apps", "ads", "app", "report.js"));

let passed = 0;
function check(name, fn) {
  try { fn(); passed += 1; } catch (e) { console.error("FAILED: " + name + "\n  " + e.message); process.exit(1); }
}
function near(actual, expected, message) { assert.ok(Math.abs(actual - expected) < 1e-9, (message || "") + " expected " + expected + " but got " + actual); }

// Today is Wednesday 21 October 2026, so this week (Monday start) began on Monday 19 October
const TODAY = "2026-10-21";
function row(date, platform, campaignId, spend, results, value) {
  return { date: date, platform: platform, campaignId: campaignId, spend: spend, results: results, value: value === undefined ? null : value, clicks: results * 10, impressions: results * 400 };
}
function dates(from, to) { const out = []; for (let d = from; d <= to; d = M.addDaysIso(d, 1)) out.push(d); return out; }

// Meta campaign c1: 10 a day, 1 result a day, 12 to 21 October. Google campaign c2: 20 a day, 1 result a day, except 50 on the 15th.
function fixture() {
  const figures = [];
  dates("2026-10-12", TODAY).forEach(function (d) {
    figures.push(row(d, "meta", "c1", 10, 1));
    figures.push(row(d, "google", "c2", d === "2026-10-15" ? 50 : 20, 1));
  });
  return M.normalise({
    settings: { businessName: "Marlow Dental", ownerName: "Sam", weekStarts: 1, result: { name: "enquiry", plural: "enquiries", kind: "lead", worth: 400, closeRate: 0.25 },
      targetCostPerResult: 20, platformTargets: { google: 25 }, monthlyBudget: 600, dailyCap: 30, weeklyCap: 150 },
    platforms: { meta: { on: true, how: "connected" }, google: { on: true, how: "export" } },
    campaigns: [
      { id: "c1", platform: "meta", name: "New patient check-up", status: "on", dailyBudget: 10, builtBy: "claude" },
      { id: "c2", platform: "google", name: "Dentist near me", status: "on", dailyBudget: 20, builtBy: "you" },
      { id: "c3", platform: "meta", name: "Summer whitening", status: "paused", dailyBudget: 8, builtBy: "you" }
    ],
    figures: figures,
    builds: [
      { id: "b1", platform: "meta", name: "Autumn offer", status: "draft", createdAt: "2026-10-10T09:00:00Z", budget: { daily: 5, start: "2026-11-03", end: "2026-11-30" } },
      { id: "b2", platform: "google", name: "Hygiene visit", status: "in-account", builtAt: "2026-10-20T09:00:00Z", createdAt: "2026-10-18T09:00:00Z" },
      { id: "b3", platform: "meta", name: "Old one", status: "live", switchedOnAt: "2026-09-01T09:00:00Z" },
      { id: "b4", platform: "meta", name: "Dropped one", status: "dropped" }
    ],
    suggestions: [{ id: "s1", status: "new", title: "Try a new headline", why: "The old one is tired" }, { id: "s2", status: "done", title: "Pause a thing" }]
  });
}

// ---------- Adding up ----------
check("rangeTotals adds spend, results, clicks and impressions for a range, a platform and a campaign", function () {
  const d = fixture();
  const all = M.rangeTotals(d, { from: "2026-10-19", to: TODAY });
  near(all.spend, 90); near(all.results, 6); near(all.clicks, 60); near(all.impressions, 2400); assert.strictEqual(all.days, 3);
  const meta = M.rangeTotals(d, { from: "2026-10-19", to: TODAY, platform: "meta" });
  near(meta.spend, 30); near(meta.results, 3);
  const c2 = M.rangeTotals(d, { from: "2026-10-12", to: "2026-10-18", campaignId: "c2" });
  near(c2.spend, 170); near(c2.results, 7);
  assert.strictEqual(M.rangeTotals(d, { from: "2026-10-19", to: TODAY, platform: "all" }).spend, 90);
  assert.strictEqual(M.rangeTotals(d, { from: "2020-01-01", to: "2020-01-31" }).spend, 0);
});
check("costPerResult is spend over results, null with no results", function () {
  const d = fixture();
  near(M.costPerResult(M.rangeTotals(d, { from: "2026-10-19", to: TODAY })), 15);
  assert.strictEqual(M.costPerResult(M.rangeTotals(d, { from: "2020-01-01", to: "2020-01-31" })), null);
  assert.strictEqual(M.rangeTotals(d, { from: "2020-01-01", to: "2020-01-31" }).costPerResult, null);
});
check("duplicate figure rows: the last one for a campaign and day stays", function () {
  const d = M.normalise({ figures: [row("2026-10-20", "meta", "c1", 10, 1), row("2026-10-21", "meta", "c1", 5, 0), row("2026-10-20", "meta", "c1", 12, 2), row("2026-10-20", "google", "c1", 3, 3)] });
  assert.strictEqual(d.figures.length, 3);
  const t = M.rangeTotals(d, { from: "2026-10-20", to: "2026-10-20", platform: "meta" });
  near(t.spend, 12); near(t.results, 2);
});
check("normalise leaves out a row with no real date and makes bad numbers 0", function () {
  const d = M.normalise({ figures: [{ date: "2026-02-31", platform: "meta", campaignId: "c1", spend: 5 }, { date: "2026-10-20", platform: "meta", campaignId: "c1", spend: "x", results: -3, value: "no" }] });
  assert.strictEqual(d.figures.length, 1);
  assert.strictEqual(d.figures[0].spend, 0); assert.strictEqual(d.figures[0].results, 0); assert.strictEqual(d.figures[0].value, null);
});
check("validate throws a plain message when a list is the wrong type", function () {
  assert.throws(function () { M.validate({ figures: {} }); }, /figures should be a list/);
  assert.throws(function () { M.validate({ platforms: [] }); }, /platforms should be a group/);
  assert.throws(function () { M.validate(null); }, /empty/);
  M.validate({});
});

// ---------- Return on ad spend ----------
check("roas uses the value the platform reported", function () {
  const d = M.normalise({ settings: { result: { worth: 400, closeRate: 0.25 } }, figures: [row("2026-10-20", "meta", "c1", 100, 4, 320), row("2026-10-21", "meta", "c1", 100, 4, 280)] });
  const r = M.roas(d, M.rangeTotals(d, { from: "2026-10-20", to: TODAY }));
  near(r.ratio, 3); assert.strictEqual(r.estimated, false); near(r.value, 600);
});
check("roas is estimated from worth and close rate when there is no reported value", function () {
  const d = fixture(), t = M.rangeTotals(d, { from: "2026-10-19", to: TODAY });
  const r = M.roas(d, t);
  near(r.ratio, 600 / 90); assert.strictEqual(r.estimated, true);
  assert.strictEqual(M.roasText(r), "£6.67 back for every £1 (estimated)");
  assert.strictEqual(M.roasText({ ratio: 3.2, estimated: false }), "£3.20 back for every £1");
});
check("roas mixes reported and estimated value row by row", function () {
  const d = M.normalise({ settings: { result: { worth: 400, closeRate: 0.25 } }, figures: [row("2026-10-20", "meta", "c1", 100, 4, 300), row("2026-10-20", "google", "c2", 100, 2)] });
  const r = M.roas(d, M.rangeTotals(d, { from: "2026-10-20", to: "2026-10-20" }));
  near(r.value, 300 + 200); assert.strictEqual(r.estimated, true);
});
check("roas uses reported value where a row has one and the estimate for the rest, never one for the other", function () {
  const rows = [row("2026-10-20", "meta", "c1", 100, 4, 300), row("2026-10-20", "google", "c2", 100, 2)], range = { from: "2026-10-20", to: "2026-10-20" };
  // Reported 300 on the Meta row, 2 x 400 x 0.25 = 200 estimated on the Google row: 500 back on 200 spent
  const mixed = M.normalise({ settings: { result: { worth: 400, closeRate: 0.25 } }, figures: rows });
  const r = M.roas(mixed, M.rangeTotals(mixed, range));
  near(r.ratio, 2.5); near(r.value, 500); assert.strictEqual(r.estimated, true);
  // The Google row has neither a reported value nor a customer value: the sum can't be trusted, so it is null with a reason
  const noWorth = M.normalise({ figures: rows }), t = M.rangeTotals(noWorth, range);
  assert.strictEqual(M.roas(noWorth, t), null);
  assert.strictEqual(M.roasReason(noWorth, t), "Return can't be worked out: some campaigns don't report sales and no customer value is set.");
  // Every row reported, so no worth is needed and nothing is estimated
  const allReported = M.normalise({ figures: [rows[0], row("2026-10-20", "google", "c2", 100, 2, 100)] }), a = M.roas(allReported, M.rangeTotals(allReported, range));
  near(a.ratio, 2); assert.strictEqual(a.estimated, false);
  assert.strictEqual(M.roasReason(allReported, M.rangeTotals(allReported, range)), "");
  // A row with no spend and no value doesn't make the rest unknown
  const quiet = M.normalise({ figures: [rows[0], row("2026-10-21", "meta", "c1", 0, 0)] });
  near(M.roas(quiet, M.rangeTotals(quiet, { from: "2026-10-20", to: "2026-10-21" })).ratio, 3);
});
check("roasText uses the currency symbol from the settings", function () {
  const usd = M.normalise({ settings: { currency: "USD" } });
  assert.strictEqual(M.symbol(usd), "$"); assert.strictEqual(M.symbol(M.normalise({})), "£");
  assert.strictEqual(M.roasText({ ratio: 3.2, estimated: true }, usd), "$3.20 back for every $1 (estimated)");
});
check("roas is null with no spend, or no reported value and no worth", function () {
  const d = M.normalise({ figures: [row("2026-10-20", "meta", "c1", 100, 4)] });
  assert.strictEqual(M.roas(d, M.rangeTotals(d, { from: "2026-10-20", to: "2026-10-20" })), null);
  const e = fixture();
  assert.strictEqual(M.roas(e, M.rangeTotals(e, { from: "2020-01-01", to: "2020-01-02" })), null);
});
check("realReturn counts customers won against spend, null with no wins", function () {
  const d = fixture();
  assert.strictEqual(M.realReturn(d, { from: "2026-10-19", to: TODAY }), null);
  d.wins = [{ id: "w1", name: "A", value: 450, wonAt: "2026-10-20", campaignId: "c1" }, { id: "w2", name: "B", value: 900, wonAt: "2026-09-01", campaignId: null }];
  const r = M.realReturn(d, { from: "2026-10-19", to: TODAY });
  assert.strictEqual(r.count, 1); near(r.value, 450); near(r.ratio, 5);
  assert.strictEqual(M.realReturn(d, { from: "2026-10-19", to: TODAY, platform: "google" }).count, 0);
});

// ---------- The traffic light ----------
check("light is green at or under target, amber up to 25% over, red beyond", function () {
  const t = function (spend, results) { return { spend: spend, results: results, days: 10 }; };
  assert.strictEqual(M.light(t(100, 5), 20).state, "green");
  assert.strictEqual(M.light(t(100, 4), 25).state, "green");
  assert.strictEqual(M.light(t(110, 5), 20).state, "amber");
  assert.strictEqual(M.light(t(125, 5), 20).state, "amber");
  assert.strictEqual(M.light(t(126, 5), 20).state, "red");
});
check("light is red with spend of at least 2 x target and no results", function () {
  const l = M.light({ spend: 40, results: 0, days: 10 }, 20);
  assert.strictEqual(l.state, "red"); assert.strictEqual(l.costPerResult, null);
});
check("light is always grey, too early to say, under 7 days of figures, before any red rule", function () {
  const none = M.light({ spend: 40, results: 0, days: 3 }, 20);
  assert.strictEqual(none.state, "grey"); assert.strictEqual(none.label, "Too early to say");
  const dear = M.light({ spend: 500, results: 5, days: 6 }, 20);
  assert.strictEqual(dear.state, "grey"); assert.strictEqual(dear.label, "Too early to say");
  assert.strictEqual(M.light({ spend: 500, results: 5, days: 7 }, 20).state, "red");
  assert.strictEqual(M.light({ spend: 40, results: 0, days: 2, historyDays: 12 }, 20).state, "red");
});
check("light is grey: no results and spend under 2 x target, under 7 days, or no target", function () {
  assert.strictEqual(M.light({ spend: 39, results: 0, days: 10 }, 20).state, "grey");
  assert.strictEqual(M.light({ spend: 0, results: 0, days: 0 }, 20).state, "grey");
  assert.strictEqual(M.light({ spend: 50, results: 5, days: 6 }, 20).state, "grey");
  assert.strictEqual(M.light({ spend: 50, results: 5, days: 6, historyDays: 9 }, 20).state, "green");
  const none = M.light({ spend: 50, results: 5, days: 10 }, null);
  assert.strictEqual(none.state, "grey"); assert.strictEqual(none.label, "No target set");
  assert.strictEqual(M.light({ spend: 50, results: 5, days: 10 }, 20).label, "On target");
  assert.strictEqual(M.light({ spend: 0, results: 0, days: 0 }, 20).label, "Too early to say");
});
check("platform and campaign lights use the platform's own target, and the age of the campaign", function () {
  const d = fixture(), range = M.rangeFor("week", TODAY, 1);
  const rows = M.byCampaign(d, range);
  assert.strictEqual(rows.length, 2);
  const c1 = rows.find(function (r) { return r.campaign.id === "c1"; }), c2 = rows.find(function (r) { return r.campaign.id === "c2"; });
  assert.strictEqual(c1.target, 20); assert.strictEqual(c2.target, 25);
  assert.strictEqual(c1.light.state, "green");   // only 3 days this week but 10 days of history
  near(c1.change.spend, 0); near(c2.change.costPerResult, 0, "c2 change");
  const platforms = M.byPlatform(d, range);
  assert.deepStrictEqual(platforms.map(function (p) { return p.key; }), ["meta", "google"]);
  assert.strictEqual(platforms[1].target, 25);
});
check("bestWorst picks the cheapest and dearest campaign per result", function () {
  const d = fixture(), bw = M.bestWorst(d, { from: "2026-10-19", to: TODAY });
  assert.strictEqual(bw.best.campaign.id, "c1"); assert.strictEqual(bw.worst.campaign.id, "c2");
});

// ---------- Ranges and weeks ----------
check("weekStart follows the setting: Monday or Sunday", function () {
  assert.strictEqual(M.weekStart("2026-10-21", 1), "2026-10-19");
  assert.strictEqual(M.weekStart("2026-10-19", 1), "2026-10-19");
  assert.strictEqual(M.weekStart("2026-10-25", 1), "2026-10-19");
  assert.strictEqual(M.weekStart("2026-10-21", 0), "2026-10-18");
  assert.strictEqual(M.weekStart("2026-10-18", 0), "2026-10-18");
  assert.strictEqual(M.weekStart("2026-01-01", 1), "2025-12-29");
});
check("weeks gives n weeks, oldest first, with gaps left empty", function () {
  const d = fixture(), w = M.weeks(d, 12, TODAY);
  assert.strictEqual(w.length, 12);
  assert.strictEqual(w[11].start, "2026-10-19"); assert.strictEqual(w[11].partial, true); assert.strictEqual(w[11].hasFigures, true);
  assert.strictEqual(w[10].start, "2026-10-12"); assert.strictEqual(w[10].partial, false);
  near(w[10].spend, 240); near(w[10].results, 14);
  assert.strictEqual(w[9].hasFigures, false); assert.strictEqual(w[9].costPerResult, null); assert.strictEqual(w[9].spend, 0);
  assert.strictEqual(w[0].start, "2026-08-03");
  const d0 = fixture(); d0.settings.weekStarts = 0;
  assert.strictEqual(M.weeks(d0, 1, TODAY)[0].start, "2026-10-18");
  near(M.weeks(d0, 1, TODAY)[0].spend, 120, "Sunday week");
});
check("weeks can be limited to a platform", function () {
  const w = M.weeks(fixture(), 2, TODAY, { platform: "meta" });
  near(w[1].spend, 30); near(w[0].spend, 70);
});
check("thisAndLast compares this week so far with the same days of last week", function () {
  const t = M.thisAndLast(fixture(), TODAY);
  assert.strictEqual(t.onDay, 3);
  near(t.thisWeek.spend, 90); near(t.lastWeek.spend, 240); near(t.lastWeekSoFar.spend, 90);
  near(t.change.spend, 0);
  near(t.change.results, 0);
});
check("rangeFor gives each range and the previous one of the same length", function () {
  const w = M.rangeFor("week", TODAY, 1);
  assert.deepStrictEqual([w.from, w.to, w.prevFrom, w.prevTo, w.days], ["2026-10-19", TODAY, "2026-10-12", "2026-10-14", 3]);
  const f = M.rangeFor("4weeks", TODAY, 1);
  assert.deepStrictEqual([f.from, f.to, f.prevFrom, f.prevTo, f.days], ["2026-09-24", TODAY, "2026-08-27", "2026-09-23", 28]);
  const m = M.rangeFor("month", TODAY, 1);
  assert.deepStrictEqual([m.from, m.to, m.prevFrom, m.prevTo], ["2026-10-01", TODAY, "2026-09-01", "2026-09-21"]);
  const t = M.rangeFor("12weeks", TODAY, 1);
  assert.strictEqual(t.days, 84);
  assert.strictEqual(M.daysBetween(t.prevTo, t.from), 1);
  const march = M.rangeFor("month", "2026-03-31", 1);
  assert.strictEqual(march.prevTo, "2026-02-28");
});

// ---------- Pace and limits ----------
check("pace projects the month end from spend so far", function () {
  const p = M.pace(fixture(), TODAY);
  near(p.spent, 330); assert.strictEqual(p.daysElapsed, 21); assert.strictEqual(p.daysInMonth, 31);
  near(p.projected, 330 / 21 * 31); assert.strictEqual(p.state, "ok"); near(p.percentOfBudget, 330 / 600);
});
check("pace is warn up to 10% over budget, bad beyond, none without a budget", function () {
  const d = fixture();
  d.settings.monthlyBudget = 470; assert.strictEqual(M.pace(d, TODAY).state, "warn");
  d.settings.monthlyBudget = 400; assert.strictEqual(M.pace(d, TODAY).state, "bad");
  d.settings.monthlyBudget = null; assert.strictEqual(M.pace(d, TODAY).state, "none");
});
check("capBreaches flags days over the daily cap and weeks over the weekly cap", function () {
  const b = M.capBreaches(fixture(), TODAY);
  assert.deepStrictEqual(b.days.map(function (x) { return x.date; }), ["2026-10-15"]); near(b.days[0].spend, 60);
  assert.deepStrictEqual(b.weeks.map(function (x) { return x.start; }), ["2026-10-12"]); near(b.weeks[0].spend, 240);
  assert.strictEqual(b.count, 2);
  const d = fixture(); d.settings.dailyCap = null; d.settings.weeklyCap = null;
  assert.strictEqual(M.capBreaches(d, TODAY).count, 0);
  const e = fixture(); e.settings.dailyCap = 29;
  assert.strictEqual(M.capBreaches(e, TODAY).days.length, 10);
});

// ---------- Checks on a new campaign ----------
function build(over) {
  return Object.assign(M.newBuild("meta"), { name: "Test", budget: { daily: 15, start: "2026-11-03", end: "2026-11-30" } }, over || {});
}
check("buildChecks: the budget guard adds the build to what is already running", function () {
  const d = fixture();
  const c = M.buildChecks(d, build(), TODAY);
  near(c.budget.existing, 10 + 170 / 7); near(c.budget.total, 15 + 10 + 170 / 7);
  assert.strictEqual(c.budget.dailyOver, true); assert.strictEqual(c.ok, false);
  assert.ok(/daily limit/.test(c.warnings[0]), c.warnings[0]);
  d.settings.dailyCap = 60; d.settings.monthlyBudget = 1500;
  const fine = M.buildChecks(d, build(), TODAY);
  assert.strictEqual(fine.budget.ok, true); assert.strictEqual(fine.ok, true); assert.deepStrictEqual(fine.warnings, []);
  const over = M.buildChecks(d, build({ budget: { daily: 16, start: null, end: null } }), TODAY);
  assert.strictEqual(over.budget.monthlyOver, true); assert.strictEqual(over.budget.dailyOver, false); assert.strictEqual(over.ok, false);
  assert.ok(/a month/.test(over.warnings[0]));
});
check("buildChecks: a live campaign's daily spend is its last 7 days divided by 7, not by the days with figures", function () {
  const figures = [row("2026-10-20", "meta", "c1", 14, 1), row("2026-10-21", "meta", "c1", 14, 1)];
  const d = M.normalise({ settings: { dailyCap: 100 }, campaigns: [{ id: "c1", platform: "meta", name: "New", status: "on" }], figures: figures });
  near(M.buildChecks(d, build(), TODAY).budget.existing, 4);
  const paused = M.normalise({ campaigns: [{ id: "c1", platform: "meta", name: "Old", status: "paused" }], figures: figures });
  near(M.buildChecks(paused, build(), TODAY).budget.existing, 0);
});
check("buildChecks: a build with no daily budget fails, and no caps means no limit", function () {
  const d = M.normalise({});
  assert.strictEqual(M.buildChecks(d, build({ budget: { daily: null } }), TODAY).ok, false);
  assert.strictEqual(M.buildChecks(d, build({ budget: { daily: 1000 } }), TODAY).ok, true);
});
check("buildChecks: the campaign's own account figures aren't counted twice", function () {
  const d = fixture(); d.settings.dailyCap = 60; d.settings.monthlyBudget = 5000;
  const c = M.buildChecks(d, build({ refs: { campaignId: "c1", url: "", file: "", sheet: "" } }), TODAY);
  near(c.budget.existing, 170 / 7);
});
check("buildChecks: the seasonal guard across a year end (11-15 to 01-10)", function () {
  const d = M.normalise({}), season = { label: "Christmas", from: "11-15", to: "01-10" };
  const ok = M.buildChecks(d, build({ season: season, budget: { daily: 5, start: "2026-12-01", end: "2027-01-05" } }), TODAY);
  assert.strictEqual(ok.season.ok, true); assert.strictEqual(ok.ok, true);
  const early = M.buildChecks(d, build({ season: season, budget: { daily: 5, start: "2026-11-10", end: "2027-01-05" } }), TODAY);
  assert.strictEqual(early.season.ok, false); assert.ok(/starts on 10 Nov/.test(early.warnings[0]), early.warnings[0]); assert.strictEqual(early.ok, false);
  const late = M.buildChecks(d, build({ season: season, budget: { daily: 5, start: "2026-12-01", end: "2027-01-20" } }), TODAY);
  assert.ok(/ends on 20 Jan/.test(late.warnings[0]), late.warnings[0]);
  const june = M.buildChecks(d, build({ season: season, budget: { daily: 5, start: "2027-06-01", end: "2027-06-30" } }), TODAY);
  assert.strictEqual(june.season.warnings.length, 2);
  assert.ok(M.inSeason(season, "2026-12-25") && M.inSeason(season, "2027-01-10") && M.inSeason(season, "2026-11-15"));
  assert.ok(!M.inSeason(season, "2026-11-14") && !M.inSeason(season, "2027-01-11"));
  assert.ok(M.inSeason({ from: "09-01", to: "11-30" }, "2026-11-30") && !M.inSeason({ from: "09-01", to: "11-30" }, "2026-12-01"));
});
check("buildChecks: every day of the run must be inside the season", function () {
  const d = M.normalise({}), summer = { label: "Summer", from: "06-01", to: "08-31" }, christmas = { label: "Christmas", from: "11-15", to: "01-10" };
  const run = function (season, start, end) { return M.buildChecks(d, build({ season: season, budget: { daily: 5, start: start, end: end } }), TODAY).season; };
  // Start and end are both in the season but the run goes round the year and out of it
  const round = run(summer, "2026-07-01", "2027-07-01");
  assert.strictEqual(round.ok, false); assert.ok(/falls outside Summer/.test(round.warnings[0]), round.warnings[0]);
  const twoYears = run(summer, "2026-07-01", "2027-07-15");
  assert.strictEqual(twoYears.ok, false); assert.ok(/more than a year/.test(twoYears.warnings[0]), twoYears.warnings[0]);
  assert.strictEqual(run(christmas, "2026-12-01", "2027-12-01").ok, false);
  // A run over the year end that stays inside is fine, and so is one inside a plain season
  assert.strictEqual(run(christmas, "2026-11-15", "2027-01-10").ok, true);
  assert.strictEqual(run(summer, "2027-06-01", "2027-08-31").ok, true);
  // Each outside warning is said once: an end outside is not repeated by the days in between
  assert.strictEqual(run(summer, "2027-07-01", "2027-09-15").warnings.length, 1);
});
check("buildChecks: today outside the season matters only when the build is about to go on", function () {
  const d = M.normalise({}), season = { label: "Christmas", from: "11-15", to: "01-10" }, b = { season: season, budget: { daily: 5, start: "2026-12-01", end: "2027-01-05" } };
  assert.strictEqual(M.buildChecks(d, build(Object.assign({ status: "draft" }, b)), TODAY).season.ok, true);
  // Approved with a start date still to come: it can't spend before then, so today doesn't count
  assert.strictEqual(M.buildChecks(d, build(Object.assign({ status: "approved" }, b)), TODAY).season.ok, true);
  // Approved with no start date: it would run from the moment it is switched on, so today counts
  const approved = M.buildChecks(d, build({ status: "approved", season: season, budget: { daily: 5 } }), TODAY);
  assert.strictEqual(approved.season.ok, false); assert.ok(/Today is outside Christmas/.test(approved.warnings[0]));
  assert.strictEqual(M.buildChecks(d, build(Object.assign({ status: "in-account" }, b)), "2026-12-20").season.ok, true);
  assert.strictEqual(M.buildChecks(d, build({ season: null }), TODAY).season, null);
});

// ---------- Waiting on you, and the health check ----------
check("todo lists what is waiting on the owner", function () {
  const t = M.todo(fixture(), TODAY);
  assert.deepStrictEqual(t.review.map(function (b) { return b.id; }), ["b1"]);
  assert.deepStrictEqual(t.switchOn.map(function (b) { return b.id; }), ["b2"]);
  assert.strictEqual(t.suggestions.length, 1); assert.strictEqual(t.breaches.count, 2);
  assert.strictEqual(t.builds, 2); assert.strictEqual(t.total, 5);
  assert.deepStrictEqual(t.items.map(function (i) { return i.kind; }), ["review", "switch-on", "suggestion", "cap", "cap"]);
  assert.strictEqual(t.items[0].view, "builds"); assert.strictEqual(t.items[2].view, "week");
  assert.strictEqual(M.todo(M.normalise({}), TODAY).total, 0);
});
check("suggestionCounts and buildGroups", function () {
  const d = fixture();
  assert.deepStrictEqual(M.suggestionCounts(d), { new: 1, approved: 0, dismissed: 0, done: 1, total: 2 });
  const g = M.buildGroups(d);
  assert.strictEqual(g.waiting.length, 1); assert.strictEqual(g.switchOn.length, 1); assert.strictEqual(g.running.length, 1); assert.strictEqual(g.ready.length, 0);
});
check("health gives 6 checks and the states follow the figures", function () {
  const h = M.health(fixture(), TODAY), by = {};
  h.forEach(function (c) { by[c.key] = c; });
  assert.deepStrictEqual(h.map(function (c) { return c.key; }), ["fresh", "cost", "pace", "caps", "tracking", "waiting"]);
  assert.strictEqual(by.fresh.state, "ok"); assert.strictEqual(by.cost.state, "ok"); assert.strictEqual(by.pace.state, "ok");
  assert.strictEqual(by.caps.state, "warn"); assert.strictEqual(by.tracking.state, "ok"); assert.strictEqual(by.waiting.state, "warn");
  assert.strictEqual(M.healthOverall(h), "warn");
  assert.strictEqual(by.cost.label, "Cost per enquiry");
  near(by.cost.value, 330 / 20);
});
check("health: stale figures, no results counted and nothing set up", function () {
  const stale = M.health(fixture(), "2026-10-30").find(function (c) { return c.key === "fresh"; });
  assert.strictEqual(stale.state, "bad"); assert.strictEqual(stale.valueText, "9 days old");
  const d = fixture();
  d.figures = M.normalise({ figures: [row("2026-10-20", "meta", "c1", 100, 0), row("2026-10-21", "meta", "c1", 10, 0)] }).figures;
  const t = M.health(d, TODAY).find(function (c) { return c.key === "tracking"; });
  assert.strictEqual(t.state, "bad"); assert.strictEqual(t.value, 1);
  const empty = M.health(M.normalise({}), TODAY);
  assert.strictEqual(empty.length, 6); assert.strictEqual(empty[0].state, "warn"); assert.strictEqual(empty[0].valueText, "No figures yet");
  assert.strictEqual(M.healthOverall(empty), "warn");
});

// ---------- Words and numbers ----------
check("money shows pence only under £10", function () {
  assert.strictEqual(M.money(4.37), "£4.37"); assert.strictEqual(M.money(9.999), "£10"); assert.strictEqual(M.money(10), "£10");
  assert.strictEqual(M.money(1234), "£1,234"); assert.strictEqual(M.money(1234567.8), "£1,234,568"); assert.strictEqual(M.money(0), "£0");
  assert.strictEqual(M.money(null), "-"); assert.strictEqual(M.money(-4.5), "-£4.50"); assert.strictEqual(M.money(12.6), "£13");
});
check("pct and change", function () {
  assert.strictEqual(M.pct(0.123), "12%"); assert.strictEqual(M.pct(0.5, { sign: true }), "+50%"); assert.strictEqual(M.pct(-0.2, { sign: true }), "-20%"); assert.strictEqual(M.pct(null), "-");
  near(M.change(110, 100), 0.1); assert.strictEqual(M.change(5, 0), null); assert.strictEqual(M.change(null, 5), null);
});
check("the counting note and the ad word limits are there", function () {
  assert.ok(/count a result differently/.test(M.COPY.countingNote));
  assert.strictEqual(M.LIMITS.google.headline, 30);
  assert.deepStrictEqual(M.charCount("google", "headline", "x".repeat(31)), { count: 31, limit: 30, over: true });
  assert.strictEqual(M.charCount("meta", "headline", "hello").over, false);
  const p = M.preview("meta", "primaryText", ("word ").repeat(60));
  assert.strictEqual(p.cut, true); assert.ok(p.shown.length <= 125);
  assert.strictEqual(M.preview("google", "primaryText", "short").cut, false);
});
check("newBuild is a draft with one empty ad and its own ids", function () {
  const b = M.newBuild("google");
  assert.strictEqual(b.status, "draft"); assert.strictEqual(b.platform, "google"); assert.strictEqual(b.ads.length, 1);
  assert.notStrictEqual(M.newBuild("google").id, b.id); assert.strictEqual(b.request, null); assert.strictEqual(b.taskId, null);
  const d = M.normalise({ builds: [{ status: "nonsense", ads: [{ media: ["m-abc123.jpg", "../x", 5] }], budget: { start: "2026-13-40" }, season: { from: "x", to: "y" } }] });
  assert.strictEqual(d.builds[0].status, "draft"); assert.deepStrictEqual(d.builds[0].ads[0].media, ["m-abc123.jpg"]);
  assert.strictEqual(d.builds[0].budget.start, null); assert.strictEqual(d.builds[0].season, null); assert.strictEqual(d.builds[0].taskId, null);
  assert.strictEqual(M.normalise({ builds: [{ taskId: "t-abc123" }] }).builds[0].taskId, "t-abc123");
});
check("isSetUp needs a result name or a platform that is on", function () {
  assert.strictEqual(M.isSetUp(M.normalise({})), false);
  assert.strictEqual(M.isSetUp(M.normalise({ settings: { result: { name: "enquiry" } } })), true);
  assert.strictEqual(M.isSetUp(M.normalise({ platforms: { meta: { on: true } } })), true);
  assert.strictEqual(M.isSetUp(M.normalise({ platforms: { meta: { on: false } } })), false);
});
check("the empty file the kit ships with normalises without trouble", function () {
  const fs = require("fs"), shipped = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "apps", "ads", "data", "ads.json"), "utf8"));
  M.validate(shipped);
  const d = M.normalise(JSON.parse(JSON.stringify(shipped)));
  assert.strictEqual(M.todo(d, TODAY).total, 0); assert.strictEqual(M.weeks(d, 12, TODAY).length, 12); assert.strictEqual(M.health(d, TODAY).length, 6);
  assert.deepStrictEqual(M.normalise(JSON.parse(JSON.stringify(shipped))).settings, shipped.settings);
});

// ---------- report.js ----------
check("report.js week prints the app's own numbers", function () {
  const text = R.weekReport(fixture(), TODAY, TODAY);
  assert.ok(/Week of Mon 19 Oct to Sun 25 Oct \(so far, up to Wed 21 Oct\)/.test(text), text);
  assert.ok(/Spend: £90 /.test(text), text);
  assert.ok(/Enquiries: 6 /.test(text), text);
  assert.ok(/Cost per enquiry: £15 /.test(text), text);
  assert.ok(/Return on ad spend: £6\.67 back for every £1 \(estimated\)/.test(text), text);
  assert.ok(/Meta: £30 spent, 3 enquiries, cost per enquiry £10 against a target of £20\. On target\./.test(text), text);
  assert.ok(/Google: £60 spent, 3 enquiries, cost per enquiry £20 against a target of £25/.test(text), text);
  assert.ok(/Best campaign by cost per enquiry: New patient check-up at £10/.test(text), text);
  assert.ok(/This month so far: £330 spent of a £600 budget, heading for £487/.test(text), text);
  assert.ok(/Over the daily limit on Thu 15 Oct: £60 against £30/.test(text), text);
  assert.ok(/count a result differently/.test(text), text);
  assert.ok(text.indexOf("\u2014") === -1);
});
check("report.js week for an earlier week reads that whole week", function () {
  const text = R.weekReport(fixture(), "2026-10-14", TODAY);
  assert.ok(/Week of Mon 12 Oct to Sun 18 Oct$/m.test(text), text);
  assert.ok(/Spend: £240 /.test(text), text);
});
check("report.js says so when there are no figures, and todo lists what waits", function () {
  assert.ok(/No figures yet/.test(R.weekReport(M.normalise({}), TODAY, TODAY)));
  const todo = R.todoReport(fixture(), TODAY);
  assert.ok(/Claude can do \(4\)/.test(todo), todo); assert.ok(/You need to \(2\)/.test(todo), todo);
  assert.ok(/Review Autumn offer/.test(todo), todo); assert.ok(/Import Hygiene visit into Google Ads Editor/.test(todo), todo);
  assert.ok(/Also waiting on you \(3\)/.test(todo), todo); assert.ok(/Decide: Try a new headline/.test(todo), todo);
  assert.strictEqual(R.todoReport(M.normalise({}), TODAY), "Nothing is waiting on you in your ads.\nNewest figures: none yet");
});
check("report.js todo says how old the newest figures are", function () {
  assert.ok(/Newest figures: from today$/.test(R.todoReport(fixture(), TODAY)));
  assert.ok(/Newest figures: 1 day old$/.test(R.todoReport(fixture(), "2026-10-22")));
  assert.ok(/Newest figures: 2 days old$/.test(R.todoReport(fixture(), "2026-10-23")));
  const quiet = fixture(); quiet.builds = []; quiet.suggestions = []; quiet.settings.dailyCap = null; quiet.settings.weeklyCap = null;
  quiet.campaigns.forEach(function (c) { c.prediction = { costPerResult: 20, resultsPerWeek: 7, spendPerWeek: 140, from: "2026-10-12", madeAt: "", basis: "plan", assumptions: [] }; });
  quiet.summaries = [{ id: "s", weekStart: "2026-10-19", text: "x", createdAt: "" }]; quiet.suggestions = [{ id: "g", kind: "other", status: "dismissed", createdAt: "2026-10-20T09:00:00Z" }];
  assert.strictEqual(R.todoReport(quiet, "2026-10-23"), "Nothing is waiting on you in your ads.\nNewest figures: 2 days old");
});
check("report.js checks prints the room per day and month, each warning, and OK or BLOCKED", function () {
  const d = fixture(); d.builds.push(build({ id: "bx", name: "Autumn offer", budget: { daily: 15, start: "2026-11-03", end: "2026-11-30" } }));
  const blocked = R.checksReport(d, "bx", TODAY);
  assert.ok(/Checks for Autumn offer \(Meta\)/.test(blocked), blocked);
  assert.ok(/Already running: £34 a day/.test(blocked), blocked);
  assert.ok(/Room per day: no room \(£4\.29 over\) \(daily limit £30\)/.test(blocked), blocked);
  assert.ok(/Room per month: no room \(£442 over\) \(monthly budget £600\)/.test(blocked), blocked);
  assert.ok(/This adds £15 a day to the £34 a day already running/.test(blocked), blocked);
  assert.ok(/Result: BLOCKED$/.test(blocked), blocked);
  d.settings.dailyCap = 60; d.settings.monthlyBudget = 2000;
  const ok = R.checksReport(d, "bx", TODAY);
  assert.ok(/Room per day: £26 a day left \(daily limit £60\)/.test(ok), ok);
  assert.ok(/Room per month: £\d[\d,]+ a month left/.test(ok), ok);
  assert.ok(/Warnings: none/.test(ok), ok); assert.ok(/Result: OK$/.test(ok), ok);
  assert.throws(function () { R.checksReport(d, "nope", TODAY); }, /no campaign with the id nope/);
  assert.ok(ok.indexOf("\u2014") === -1);
});

// ---------- Round 2: predictions, ads, account changes, the To do lists ----------
function pred(over) { return Object.assign({ costPerResult: 10, resultsPerWeek: 7, spendPerWeek: 70, from: "2026-10-12", madeAt: "2026-10-12T09:00:00Z", basis: "plan", assumptions: ["The same audience as before."] }, over || {}); }
// c1 (Meta) has spent 10 and got 1 result on each of 12 to 21 October, so from 12 to 20 October that is 9 days, 7 results a week, £10 each
function scored(p, campaignOver) {
  const d = fixture();
  Object.assign(d.campaigns[0], { prediction: p }, campaignOver || {});
  return M.predictionScore(d, d.campaigns[0], TODAY);
}
check("predictionScore: as predicted is on track at 100, and the sums are in plain words", function () {
  const s = scored(pred());
  assert.strictEqual(s.state, "on-track"); assert.strictEqual(s.score, 100); assert.strictEqual(s.days, 9);
  near(s.actual.resultsPerWeek, 7); near(s.actual.costPerResult, 10); near(s.resultsRatio, 1); near(s.costRatio, 1);
  assert.strictEqual(s.label, "Score 100: on track with what Claude predicted"); assert.strictEqual(s.sums.length, 3);
  assert.ok(/^Enquiries a week: 7 against 7 predicted, so 1\./.test(s.sums[0]), s.sums[0]);
  assert.strictEqual(M.predictionWords(s, fixture()), "Claude predicted £10 per enquiry and 7 a week; it's doing £10 and 7 a week.");
});
check("predictionScore: ahead at 110 or more, behind under 90", function () {
  const ahead = scored(pred({ costPerResult: 14, resultsPerWeek: 5 }));
  assert.strictEqual(ahead.state, "ahead"); assert.strictEqual(ahead.score, 140); assert.strictEqual(ahead.label, "Score 140: ahead of what Claude predicted");
  const edge = scored(pred({ costPerResult: 11, resultsPerWeek: 7 }));   // costRatio 1.1, resultsRatio 1: average 1.05, so 105, on track
  assert.strictEqual(edge.score, 105); assert.strictEqual(edge.state, "on-track");
  const at110 = scored(pred({ costPerResult: 12, resultsPerWeek: 7 }));   // 1.2 and 1: exactly 110 is ahead
  assert.strictEqual(at110.score, 110); assert.strictEqual(at110.state, "ahead");
  const at90 = scored(pred({ costPerResult: 8, resultsPerWeek: 7 }));   // 0.8 and 1: exactly 90 is still on track
  assert.strictEqual(at90.score, 90); assert.strictEqual(at90.state, "on-track");
  const behind = scored(pred({ costPerResult: 8, resultsPerWeek: 10 }));
  assert.strictEqual(behind.state, "behind"); assert.strictEqual(behind.score, 75);
  assert.strictEqual(scored(pred({ costPerResult: 7, resultsPerWeek: 7 })).state, "behind");   // 0.7 and 1 average 85
});
check("predictionScore: the score caps each ratio at 2", function () {
  const s = scored(pred({ costPerResult: 100, resultsPerWeek: 1 }));
  near(s.resultsRatio, 2); near(s.costRatio, 2); assert.strictEqual(s.score, 200); assert.ok(/the most it counts/.test(s.sums[0]), s.sums[0]);
  const one = scored(pred({ costPerResult: null, resultsPerWeek: 1 }));   // only results predicted
  assert.strictEqual(one.costRatio, null); assert.strictEqual(one.score, 200);
  assert.strictEqual(M.predictionWords(one, fixture()), "Claude predicted 1 a week; it's doing 7 a week.");
});
check("predictionScore: too early under 7 days, or with no results and little spend", function () {
  const young = scored(pred({ from: "2026-10-18" }));
  assert.strictEqual(young.state, "too-early"); assert.strictEqual(young.score, null); assert.strictEqual(young.days, 3);
  assert.ok(/too early to say/.test(M.predictionWords(young, fixture())), M.predictionWords(young, fixture()));
  const quiet = M.normalise({ campaigns: [{ id: "q", platform: "meta", name: "Q", status: "on", prediction: pred({ from: "2026-10-01" }) }],
    figures: dates("2026-10-01", "2026-10-20").map(function (d) { return row(d, "meta", "q", 0.5, 0); }) });
  assert.strictEqual(M.predictionScore(quiet, "q", TODAY).state, "too-early");   // 10 spent, under 2 x £10
  quiet.figures.forEach(function (f) { f.spend = 2; });
  const stuck = M.predictionScore(quiet, "q", TODAY);   // 40 spent, no results, over 2 x £10
  assert.strictEqual(stuck.state, "behind"); assert.strictEqual(stuck.score, 0); assert.strictEqual(stuck.costRatio, 0);
});
check("predictionScore: none without a usable prediction, and today's figures are left out", function () {
  const d = fixture();
  assert.strictEqual(M.predictionScore(d, d.campaigns[0], TODAY).state, "none");
  assert.strictEqual(M.predictionScore(d, "nope", TODAY).state, "none");
  assert.strictEqual(M.predictionScore(d, d.campaigns[0], TODAY).label, "No prediction yet");
  assert.ok(/hasn't predicted/.test(M.predictionWords(M.predictionScore(d, d.campaigns[0], TODAY), d)));
  assert.strictEqual(scored(pred({ costPerResult: null, resultsPerWeek: null })).state, "none");
  assert.strictEqual(scored(pred({ from: null })).state, "none");
  assert.strictEqual(scored(pred(), {}).days, 9);   // 12 to 20 October, not the 21st
});

function adFixture() {
  const d = fixture();
  d.campaigns[0].ads = [{ id: "a1", name: "Smile", headline: "Book a check-up", status: "on" }, { id: "a2", platformId: "pf2", name: "Offer", status: "paused" }, { id: "a3", name: "New" }];
  d.adFigures = [
    { date: "2026-10-20", platform: "meta", campaignId: "c1", adId: "a1", spend: 6, results: 1, value: null, clicks: 8, impressions: 300 },
    { date: "2026-10-21", platform: "meta", campaignId: "c1", adId: "a1", spend: 4, results: 0, value: null, clicks: 3, impressions: 200 },
    { date: "2026-10-21", platform: "meta", campaignId: "c1", adId: "pf2", spend: 5, results: 2, value: 40, clicks: 5, impressions: 100 },
    { date: "2026-10-21", platform: "meta", campaignId: "c2", adId: "a1", spend: 99, results: 9, value: null, clicks: 1, impressions: 1 }
  ];
  return M.normalise(d);
}
check("adsFor gives each ad its totals for the range, null where it has none", function () {
  const d = adFixture(), r = M.adsFor(d, "c1", { from: "2026-10-19", to: TODAY });
  assert.strictEqual(r.length, 3); assert.strictEqual(r[0].ad.id, "a1");
  near(r[0].totals.spend, 10); near(r[0].totals.results, 1); near(r[0].totals.costPerResult, 10); assert.strictEqual(r[0].totals.days, 2);
  near(r[1].totals.spend, 5); near(r[1].totals.value, 40); near(r[1].totals.costPerResult, 2.5);   // matched by the platform's own id
  assert.strictEqual(r[2].totals, null);
  assert.strictEqual(M.adsFor(d, "c1", { from: "2026-10-21", to: TODAY })[0].totals.spend, 4);
  assert.strictEqual(M.adsFor(d, "c1")[0].totals.spend, 10);
  assert.deepStrictEqual(M.adsFor(d, "nope", {}), []);
  assert.strictEqual(M.rangeTotals(d, { campaignId: "c1", from: "2026-10-20", to: TODAY }).spend, 20);   // campaign totals never come from the ads
});

check("actionChecks: a daily budget over the cap is not ok, a lower one is", function () {
  const d = fixture();   // c2 runs at about £24 a day, daily limit £30
  const over = M.actionChecks(d, M.newAction("budget", { campaignId: "c1", budgetFrom: 10, budgetTo: 20 }), TODAY);
  assert.strictEqual(over.ok, false); assert.ok(/daily limit is £30/.test(over.warnings[0]), over.warnings[0]);
  near(over.budget.existing, 170 / 7); near(over.budget.total, 20 + 170 / 7);
  const fine = M.actionChecks(d, M.newAction("budget", { campaignId: "c1", budgetFrom: 10, budgetTo: 5 }), TODAY);
  assert.strictEqual(fine.ok, true); assert.deepStrictEqual(fine.warnings, []);
  d.settings.dailyCap = 100; d.settings.monthlyBudget = 600;   // 30.4 x (20 + 24.3) is over £600
  const month = M.actionChecks(d, M.newAction("budget", { campaignId: "c1", budgetFrom: 10, budgetTo: 20 }), TODAY);
  assert.strictEqual(month.ok, false); assert.ok(/a month, against your budget of £600/.test(month.warnings[0]), month.warnings[0]);
  assert.strictEqual(M.actionChecks(d, M.newAction("budget", { campaignId: "c1", budgetTo: null }), TODAY).ok, false);
  assert.strictEqual(M.actionChecks(d, M.newAction("budget", { campaignId: "zz", budgetTo: 5 }), TODAY).ok, false);
});
check("actionChecks: a switch-on follows the build's budget and seasonal guard", function () {
  const d = fixture(); d.settings.dailyCap = 100; d.settings.monthlyBudget = 5000;
  d.builds.push(build({ id: "bs", name: "Christmas vouchers", status: "in-account", season: { label: "Christmas", from: "11-15", to: "01-10" }, budget: { daily: 6, start: "2026-11-10", end: "2026-12-24" } }));
  const bad = M.actionChecks(d, M.newAction("switch-on", { buildId: "bs" }), TODAY);
  assert.strictEqual(bad.ok, false); assert.ok(/starts on 10 Nov, outside Christmas/.test(bad.warnings[0]), bad.warnings[0]); assert.strictEqual(bad.season.ok, false);
  d.builds[d.builds.length - 1].budget.start = "2026-11-20";
  assert.strictEqual(M.actionChecks(d, M.newAction("switch-on", { buildId: "bs" }), "2026-11-20").ok, true);
  const googleChange = M.actionChecks(d, M.newAction("pause", { platform: "google", campaignId: "c2" }), TODAY);
  assert.strictEqual(googleChange.ok, false); assert.ok(/only make changes in Meta/.test(googleChange.warnings[0]));
  assert.strictEqual(M.actionChecks(d, M.newAction("pause", { campaignId: "c1" }), TODAY).ok, true);
  assert.strictEqual(M.actionChecks(d, M.newAction("switch-on", { buildId: "none" }), TODAY).ok, false);
  assert.strictEqual(M.actionChecks(d, { kind: "delete" }, TODAY).ok, false);
});
check("newAction and actionSentence", function () {
  const a = M.newAction("budget", { campaignId: "c1", budgetFrom: 10, budgetTo: 15 });
  assert.strictEqual(a.status, "requested"); assert.strictEqual(a.platform, "meta"); assert.strictEqual(a.doneAt, null); assert.ok(/^ac-/.test(a.id)); assert.notStrictEqual(M.newAction("pause").id, a.id);
  const d = fixture();
  assert.strictEqual(M.actionSentence(d, a, TODAY), "Change the daily budget of New patient check-up in your Meta account from £10 to £15 a day.");
  d.builds.push(build({ id: "bv", name: "Christmas gift vouchers", budget: { daily: 6, start: "2026-11-15", end: "2026-12-24" } }));
  assert.strictEqual(M.actionSentence(d, M.newAction("switch-on", { buildId: "bv" }), TODAY), "Switch on Christmas gift vouchers in your Meta account. It starts spending up to £6 a day from 15 Nov.");
  assert.ok(/straight away\.$/.test(M.actionSentence(d, M.newAction("switch-on", { buildId: "bv" }), "2026-11-16")));
  assert.ok(/^Pause New patient check-up in your Meta account\./.test(M.actionSentence(d, M.newAction("pause", { campaignId: "c1" }), TODAY)));
  assert.deepStrictEqual(Object.keys(M.ACTION_LABELS), ["switch-on", "pause", "budget"]);
  ["Switch on", "Pause", "Change daily budget"].forEach(function (w) { assert.ok(Object.keys(M.ACTION_LABELS).some(function (k) { return M.ACTION_LABELS[k] === w; })); });
});

check("actionChecks: a pause is refused for something already paused or an ad that isn't there", function () {
  const d = fixture();
  d.campaigns[0].ads = [{ id: "a1", name: "One", status: "on" }, { id: "a2", name: "Two", status: "paused" }];
  M.normalise(d);
  assert.strictEqual(M.actionChecks(d, M.newAction("pause", { campaignId: "c1" }), TODAY).ok, true);
  assert.strictEqual(M.actionChecks(d, M.newAction("pause", { campaignId: "c1", adId: "a1" }), TODAY).ok, true);
  const paused = M.actionChecks(d, M.newAction("pause", { campaignId: "c3" }), TODAY);
  assert.strictEqual(paused.ok, false); assert.ok(/already paused/.test(paused.warnings[0]), paused.warnings[0]);
  const adPaused = M.actionChecks(d, M.newAction("pause", { campaignId: "c1", adId: "a2" }), TODAY);
  assert.strictEqual(adPaused.ok, false); assert.ok(/already paused/.test(adPaused.warnings[0]), adPaused.warnings[0]);
  const missing = M.actionChecks(d, M.newAction("pause", { campaignId: "c1", adId: "zz" }), TODAY);
  assert.strictEqual(missing.ok, false); assert.ok(/can't find that ad/.test(missing.warnings[0]), missing.warnings[0]);
});
check("settings.seasons: normalised, and todoList uses them unless seasons are passed", function () {
  const d = fixture();
  assert.deepStrictEqual(d.settings.seasons, []);
  assert.deepStrictEqual(M.normalise({}).settings.seasons, []);
  d.settings.seasons = [{ label: " Christmas ", from: "11-15", to: "01-10", extra: 1 }, { label: "Bad", from: "13-01", to: "01-10" }, "junk", { label: "Summer", from: "06-01", to: "08-31" }];
  M.normalise(d);
  assert.deepStrictEqual(d.settings.seasons, [{ label: "Christmas", from: "11-15", to: "01-10" }, { label: "Summer", from: "06-01", to: "08-31" }]);
  const keys = function (l) { return l.claude.map(function (i) { return i.key; }); };
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("season:Christmas:2026-11-15") > -1);
  assert.ok(!keys(M.todoList(d, TODAY)).some(function (k) { return /^season:Summer/.test(k); }));
  assert.ok(!keys(M.todoList(d, TODAY, { seasons: [] })).some(function (k) { return /^season:/.test(k); }));   // passed seasons win
  d.settings.seasons = "nonsense"; M.normalise(d);
  assert.deepStrictEqual(d.settings.seasons, []);
});
check("todoList: Connect your Meta account shows unless Meta is connected", function () {
  const d = fixture(), has = function () { return M.todoList(d, TODAY).you.some(function (i) { return i.key === "connect-meta"; }); };
  assert.strictEqual(has(), false);                                  // Meta connected
  d.platforms.meta.how = "export"; d.platforms.google.how = "connected";
  assert.strictEqual(has(), true);                                   // something else is connected, Meta isn't
  delete d.platforms.meta; assert.strictEqual(has(), true);
});
check("todoList: Claude's list and yours, with stable keys", function () {
  const d = fixture(), l = M.todoList(d, TODAY);
  assert.deepStrictEqual(l.claude.map(function (i) { return i.key; }), ["analyse:c1", "analyse:c2", "summary:2026-10-19", "changes"]);
  assert.deepStrictEqual(l.you.map(function (i) { return i.key; }), ["review:b1", "import:b2"]);
  assert.strictEqual(l.claude[0].job, "analyse-campaign"); assert.strictEqual(l.claude[0].ref, "c1"); assert.strictEqual(l.claude[0].label, "Analyse New patient check-up");
  assert.strictEqual(l.claude[2].job, "how-did-the-ads-do"); assert.strictEqual(l.claude[3].job, "what-should-i-change");
  assert.ok(l.you.every(function (i) { return i.give && i.open && i.why && i.label && i.button; }));
  assert.deepStrictEqual(M.todoList(d, TODAY), l);   // the same twice
  assert.strictEqual(M.todo(d, TODAY).count, 6); assert.strictEqual(M.todo(d, TODAY).claude.length, 4);
  const empty = M.todoList(M.normalise({}), TODAY);
  assert.deepStrictEqual(empty, { claude: [], you: [] });
});
check("todoList: reasons come and go with the data", function () {
  const d = fixture(), keys = function (x) { return x.claude.concat(x.you).map(function (i) { return i.key; }); };
  Object.assign(d.campaigns[0], { prediction: pred() });
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("analyse:c1") === -1);                       // predicted and on track: nothing to analyse
  d.campaigns[0].prediction = pred({ costPerResult: 8, resultsPerWeek: 10 });
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("analyse:c1") > -1);                          // behind
  d.analyses = [{ id: "n1", campaignId: "c1", at: "2026-10-20T10:00:00Z", summary: "x", working: [], wasting: [], couldNotSee: [] }];
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("analyse:c1") === -1);                       // analysed this week
  d.campaigns[0].prediction = null; d.analyses = []; d.campaigns[0].request = { kind: "analyse", note: "", at: "" };
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("analyse:c1") === -1);                       // already asked
  const stale = M.todoList(d, "2026-10-26");
  assert.strictEqual(stale.claude[0].key, "refresh"); assert.ok(/5 days old/.test(stale.claude[0].why)); assert.strictEqual(stale.claude[0].job, "update-my-ads");
  d.settings.result.worth = null;
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("worth") > -1);
  d.settings.result.kind = "sale"; assert.ok(keys(M.todoList(d, TODAY)).indexOf("worth") === -1);
  d.platforms.meta.how = "export"; d.platforms.google.how = "export";
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("connect-meta") > -1);
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("summary:2026-10-19") > -1);
  d.summaries = [{ id: "s1", weekStart: "2026-10-19", text: "x", createdAt: "" }];
  assert.ok(keys(M.todoList(d, TODAY)).indexOf("summary:2026-10-19") === -1);
});
check("todoList: switch-on, pause, photos, Google, needs and seasons", function () {
  const d = fixture();
  d.builds.push(build({ id: "bm", name: "Vouchers", status: "in-account", ads: [{ id: "x1", headline: "Gift a smile", media: [] }, { id: "x2", headline: "Two", media: ["m-abc123.jpg"] }], needs: "Which branch is this for?" }));
  d.builds.push(build({ id: "bg", name: "Search", platform: "google", status: "ready-to-import" }));
  d.suggestions.push({ id: "g1", kind: "pause", platform: "meta", campaignId: "c1", title: "Pause the check-up ad", status: "approved", decidedAt: "2026-10-20T09:00:00Z" });
  d.suggestions.push({ id: "g2", kind: "budget", platform: "google", campaignId: "c2", title: "Raise the budget", status: "approved" });
  M.normalise(d);
  const l = M.todoList(d, TODAY, { seasons: [{ label: "Christmas", from: "11-15", to: "01-10" }, { label: "Summer", from: "06-01", to: "08-31" }] }), keys = l.claude.concat(l.you).map(function (i) { return i.key; });
  const sw = l.claude.find(function (i) { return i.key === "switch-on:bm"; });
  assert.deepStrictEqual(sw.action, { kind: "switch-on", platform: "meta", buildId: "bm", campaignId: "" });
  const ps = l.claude.find(function (i) { return i.key === "pause:g1"; });
  assert.deepStrictEqual(ps.action, { kind: "pause", platform: "meta", campaignId: "c1" });
  assert.ok(keys.indexOf("season:Christmas:2026-11-15") > -1); assert.ok(!keys.some(function (k) { return /^season:Summer/.test(k); }));
  assert.ok(keys.indexOf("photo:bm:x1") > -1); assert.ok(keys.indexOf("photo:bm:x2") === -1);
  assert.ok(keys.indexOf("import:bg") > -1); assert.ok(keys.indexOf("google:g2") > -1); assert.ok(keys.indexOf("needs:bm") > -1);
  assert.strictEqual(l.you.find(function (i) { return i.key === "google:g2"; }).open.url, "https://ads.google.com/");
  assert.strictEqual(l.you.find(function (i) { return i.key === "needs:bm"; }).why, "Which branch is this for?");
  // once the owner has said yes, Claude's item and the owner's switch-on both go
  const before = M.todo(d, TODAY).switchOn.length;
  d.actions.push(M.newAction("switch-on", { buildId: "bm" })); d.actions.push(M.newAction("pause", { campaignId: "c1" }));
  const after = M.todoList(d, TODAY), akeys = after.claude.map(function (i) { return i.key; });
  assert.ok(akeys.indexOf("switch-on:bm") === -1 && akeys.indexOf("pause:g1") === -1);
  assert.strictEqual(M.todo(d, TODAY).switchOn.length, before - 1);
  d.actions = [Object.assign(M.newAction("pause", { campaignId: "c1" }), { status: "done", requestedAt: "2026-10-21T09:00:00Z" })];
  assert.ok(M.todoList(d, TODAY).claude.every(function (i) { return i.key !== "pause:g1"; }));
});
check("todo and todoList agree on the builds that are waiting", function () {
  const d = fixture(); d.builds.push(build({ id: "bm", status: "in-account" }));
  const t = M.todo(d, TODAY), l = M.todoList(d, TODAY), ids = function (list, prefix) { return list.filter(function (i) { return i.key.indexOf(prefix) === 0; }).map(function (i) { return i.ref; }).sort(); };
  assert.deepStrictEqual(ids(l.you, "review:"), t.review.map(function (b) { return b.id; }).sort());
  assert.deepStrictEqual(ids(l.claude, "switch-on:").concat(ids(l.you, "import:")).sort(), t.switchOn.map(function (b) { return b.id; }).sort());
});

check("normalise: an old file without the round 2 fields still reads, and fills them in", function () {
  const d = M.normalise({ campaigns: [{ id: "c1", platform: "meta", name: "Old", status: "on" }], builds: [{ id: "b1", platform: "meta", status: "draft" }] });
  M.validate(d);
  assert.deepStrictEqual(d.campaigns[0].ads, []); assert.strictEqual(d.campaigns[0].prediction, null); assert.strictEqual(d.campaigns[0].request, null);
  assert.deepStrictEqual([d.adFigures, d.analyses, d.actions], [[], [], []]);
  assert.strictEqual(d.builds[0].prediction, null); assert.strictEqual(d.builds[0].fromCampaignId, ""); assert.strictEqual(d.builds[0].brief, null); assert.strictEqual(d.builds[0].needs, "");
  const empty = M.normalise({}); assert.deepStrictEqual([empty.adFigures, empty.analyses, empty.actions], [[], [], []]);
  assert.throws(function () { M.validate({ actions: {} }); }, /actions should be a list/);
  assert.throws(function () { M.validate({ analyses: "x" }); }, /analyses should be a list/);
  assert.throws(function () { M.validate({ adFigures: 5 }); }, /adFigures should be a list/);
});
check("normalise: the round 2 fields are cleaned up", function () {
  const d = M.normalise({
    campaigns: [{ id: "c1", platform: "meta", name: "N", status: "on", prediction: { costPerResult: "x", resultsPerWeek: 4, from: "2026-02-31", basis: "guess", assumptions: ["a", 5, ""] },
      request: { kind: "other" }, ads: [{ id: "a1", headline: "Hi", media: ["m-abc123.png", "../bad"], status: "weird" }, "junk"] }, { id: "c2", platform: "meta", name: "M", request: { kind: "analyse", note: "n", at: "t" } }],
    adFigures: [{ date: "2026-10-20", platform: "meta", campaignId: "c1", adId: "a1", spend: 5 }, { date: "2026-10-20", platform: "meta", campaignId: "c1", adId: "a1", spend: 7 }, { date: "2026-10-20", platform: "meta", campaignId: "c1", spend: 1 }],
    builds: [{ id: "b1", prediction: { costPerResult: 20, from: "2026-11-03" }, fromCampaignId: 5, brief: { audience: "change", words: "nonsense", daily: -4, start: "2026-11-03" }, needs: 7 }],
    analyses: [{ id: "n1", campaignId: "c1", summary: "S", working: ["a", 1], wasting: "no" }, null],
    actions: [{ id: "x1", kind: "pause", campaignId: "c1", status: "weird", budgetTo: -1 }, { id: "x2", kind: "delete" }, { id: "x3", kind: "budget", budgetTo: 15, status: "done", doneAt: "t" }]
  });
  const c = d.campaigns[0];
  assert.deepStrictEqual(c.prediction, { costPerResult: null, resultsPerWeek: 4, spendPerWeek: null, from: null, madeAt: "", basis: "plan", assumptions: ["a"] });
  assert.strictEqual(c.request, null); assert.strictEqual(c.ads.length, 1); assert.deepStrictEqual(c.ads[0].media, ["m-abc123.png"]); assert.strictEqual(c.ads[0].status, "paused");
  assert.deepStrictEqual(d.campaigns[1].request, { kind: "analyse", note: "n", at: "t" });
  assert.strictEqual(d.adFigures.length, 1); near(d.adFigures[0].spend, 7);
  assert.strictEqual(d.builds[0].prediction.from, "2026-11-03"); assert.strictEqual(d.builds[0].fromCampaignId, ""); assert.strictEqual(d.builds[0].needs, "");
  assert.deepStrictEqual(d.builds[0].brief, { audience: "change", audienceNote: "", budget: "same", daily: null, start: "2026-11-03", end: null, words: "keep", note: "" });
  assert.strictEqual(d.analyses.length, 1); assert.deepStrictEqual(d.analyses[0].working, ["a"]); assert.deepStrictEqual(d.analyses[0].wasting, []);
  assert.deepStrictEqual(d.actions.map(function (a) { return a.id; }), ["x1", "x3"]);
  assert.strictEqual(d.actions[0].status, "failed"); assert.strictEqual(d.actions[0].note, "unclear entry, not acted on"); assert.strictEqual(d.actions[0].budgetTo, null); assert.strictEqual(d.actions[1].doneAt, "t"); assert.strictEqual(d.actions[0].platform, "meta");
});

check("report.js campaign and action print the app's numbers from a fixture file", function () {
  const fs = require("fs"), os = require("os"), cp = require("child_process");
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), "ads-report-")), file = path.join(dir, "ads.json");
  const d = adFixture();
  d.settings.dailyCap = 30; d.settings.monthlyBudget = 5000;
  d.campaigns[0].prediction = pred({ costPerResult: 14, resultsPerWeek: 5 });
  d.analyses = [{ id: "n1", campaignId: "c1", at: "2026-10-20T10:00:00Z", summary: "The offer ad is carrying it.", working: [], wasting: [], couldNotSee: [] }];
  d.actions = [M.newAction("budget", { campaignId: "c1", budgetFrom: 10, budgetTo: 25 }), M.newAction("budget", { campaignId: "c1", budgetFrom: 10, budgetTo: 5 })];
  d.actions[0].id = "ac-over"; d.actions[1].id = "ac-fine";
  fs.writeFileSync(file, JSON.stringify(d));
  const loaded = R.load(file);
  const text = R.campaignReport(loaded, "c1", TODAY);
  assert.ok(/^New patient check-up \(Meta, on, £10 a day\)/.test(text), text);
  assert.ok(/Last 4 weeks \(\d+ \w+ to 21 Oct\)\n  Spend: £100, enquiries: 10, cost per enquiry: £10, return on ad spend: £/.test(text), text);
  assert.ok(/Light: On target \(target £20\)/.test(text), text);
  assert.ok(/Week of 19 Oct \(so far\): £30 spent, 3 enquiries, cost per enquiry £10/.test(text), text);
  assert.ok((text.match(/^  Week of /gm) || []).length === 12, text);
  assert.ok(/Smile \(on\): £10 spent, 1 enquiries.*Headline: Book a check-up/.test(text) && /Offer \(paused\): £5\.00 spent, 2 enquiries, cost per enquiry £2\.50/.test(text), text);
  assert.ok(/New \(paused\): no figures for it in the last 4 weeks/.test(text), text);
  assert.ok(/Prediction: Score 140: ahead of what Claude predicted/.test(text), text);
  assert.ok(/Claude predicted £14 per enquiry and 5 a week; it's doing £10 and 7 a week\./.test(text), text);
  assert.ok(/Assumptions: The same audience as before\./.test(text), text);
  assert.ok(/Newest analysis \(Tue 20 Oct\): The offer ad is carrying it\./.test(text), text);
  assert.ok(text.indexOf("\u2014") === -1);
  assert.throws(function () { R.campaignReport(loaded, "nope", TODAY); }, /no campaign with the id nope/);
  const blocked = R.actionReport(loaded, "ac-over", TODAY);
  assert.ok(/^Change: Change the daily budget of New patient check-up in your Meta account from £10 to £25 a day\./.test(blocked), blocked);
  assert.ok(/Room per day: £5\.71 a day left \(daily limit £30\)/.test(blocked), blocked);
  assert.ok(/Result: BLOCKED$/.test(blocked), blocked);
  const ok = R.actionReport(loaded, "ac-fine", TODAY);
  assert.ok(/Warnings: none/.test(ok) && /Result: OK$/.test(ok), ok);
  assert.throws(function () { R.actionReport(loaded, "nope", TODAY); }, /no account change with the id nope/);
  // the command line asks for an id and refuses one that isn't there
  const cli = path.join(__dirname, "..", "apps", "ads", "app", "report.js");
  ["campaign", "action"].forEach(function (cmd) {
    const r = cp.spawnSync(process.execPath, [cli, cmd, "no-such-id"], { encoding: "utf8" });
    assert.strictEqual(r.status, 2); assert.ok(/There is no/.test(r.stderr), r.stderr);
    assert.strictEqual(cp.spawnSync(process.execPath, [cli, cmd], { encoding: "utf8" }).status, 2);
  });
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log("All " + passed + " checks passed.");
