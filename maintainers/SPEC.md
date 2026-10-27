# Ads OS: build spec

Written 21 October 2026 from George's brief (`maintainers/BUILD-PROMPT.md`) and the plan he agreed the same day. Every builder works from this file. The reference kit is Content Machine OS (`~/Repos/getaipowers/content-machine-os`, shared version 7). This kit started as `git archive main` of it, so its files are already here. Where this spec doesn't say, copy Content Machine OS's pattern and note it here.

Tool id `ads`, name **Ads OS**, folder `apps/ads/`, data file `apps/ads/data/ads.json`, code namespace `window.AD`, sidebar icon `barChart`, repository `ads-os`, shared version 7, `"media": true` (for ad pictures and videos the owner adds).

## George's decisions (21 October 2026)

1. **Claude builds campaigns paused. Nothing spends without the owner.** Claude builds the full campaign: audience, ad words, budget and dates. On Meta, Claude creates it in the ad account with every campaign, ad set and ad set to PAUSED, then reads it back to confirm. On Google Ads, Google's own connection only reads, so Claude writes a Google Ads Editor import file plus a click-by-click build sheet. The owner imports it, and it arrives paused. Either way the owner reviews it in the app and switches it on in Ads Manager or Google Ads.
2. **Claude never switches anything on and never changes a live campaign.** It never pauses, edits, re-budgets or deletes anything that already exists in an ad account. Suggested changes go to the owner (and to Task List OS when attached) for them to make.
3. **claude-ads is installed from GitHub during setup, not copied into the kit.** It comes from George's fork `georgecairns-ui/claude-ads`, pinned to tag `v2.0.1` (commit `669c7608ecb50dd95c941a71fa3ca0a1c0e40512`). It is installed skills-only into this folder's own `.claude/skills` and `.claude/agents`. Its MIT licence and third-party notices are copied in beside it.
4. Name **Ads OS** (covers Meta and Google). Public repository `ads-os`.
5. Vault City Brewing's "Claude Ads: what you can do now" guide is the reference for the ideas. Never use client names in the kit:
   - ask where your ads are first
   - a **seasonal guard**: a Christmas ad can never run in June
   - **daily and weekly spend limits** tied to return
   - drafts the owner approves
6. Demo artifact uses **Marlow Dental** (from the shared demo cast; new patient enquiries from Google and Meta). Its booking button goes to Joey: `https://calendly.com/joey-getaipowers/claude-chat`. The kit keeps the catalogue's booking link.

## Wording rules (customer-facing text, and code comments)

- British English. Digits for numbers. No em dashes anywhere.
- Never say agent, repo, repository, artifact, JSON, schema, API or MCP on screen.
- No "delve", "game-changer", "unlock", "seamless", "leverage". No hype, no lists of 3 for effect.
- No prices for Get AI Powers services; point to getaipowers.com only.
- No demo mode or sample data in the kit (shared v6 rule).
- Money is GBP by default, shown as `£1,234` (pence only under £10, for example `£4.37`).

## The platforms

`AD.PLATFORMS` in `model.js`, display order:

| key | label | short | manager link | how Claude builds |
|---|---|---|---|---|
| `meta` | Meta (Facebook and Instagram) | Meta | https://adsmanager.facebook.com/ | in the account, paused, through the Meta connection |
| `google` | Google Ads | Google | https://ads.google.com/ | Google Ads Editor import file plus build sheet (in `files/04-marketing/ads/`) |

Badges are CSS tags from theme tokens, never logos. One sentence on screen, wherever platforms are compared: **"Google and Meta count a result differently (Meta counts some results from people who only saw an ad, Google mostly counts clicks), so judge each against its own target rather than against each other."** Keep it in `AD.COPY.countingNote`.

## The numbers (all worked out by the app, never typed by Claude)

Raw figures only go in the file. `model.js` does every sum:

- `spend`, `results`, `value`, `clicks` and `impressions` for any date range, platform or campaign.
- `costPerResult = spend / results` (null when results is 0).
- `roas = value / spend`, worked row by row. A row with a platform-reported `value` uses it. A row without one (leads, calls) uses the owner's estimate, `results x settings.result.worth x settings.result.closeRate`, when both are set. The result is marked "estimated" whenever any part of it is estimated. If some spend has neither (a row reports no value and no worth or close rate is set), the return is null, with the plain reason `AD.COPY.roasUnknown` for the views to show ("Return can't be worked out: some campaigns don't report sales and no customer value is set."). Also null when spend is 0. Shown as "£3.20 back for every £1", the symbol coming from `settings.currency` (`model.symbol(data)`).
- Real return when Pipeline OS is attached: `sum(wins.value) / spend` for the same range, labelled "from customers you've won".
- **Traffic light** per campaign (and platform) for the chosen range, against `settings.targetCostPerResult` (per platform if set in `settings.platformTargets[key]`):
  - green: cost per result at or under target
  - amber: up to 25% over
  - red: more than 25% over, or no results yet with spend at least 2 x target
  - grey "Too early to say": under 7 days of figures (always, checked before any red rule), or no results and spend under 2 x target
- **Weeks**: start on `settings.weekStarts` (1 = Monday). Compares this week with last week, plus a 12-week trend (spend bars, cost per result line, target line).
- **Pace**: spend so far this month against `settings.monthlyBudget`, projected month end = spend so far / days elapsed x days in month. Days with spend over `settings.dailyCap` and weeks over `settings.weeklyCap` are flagged.
- **Budget guard for builds**: the daily budget of a build plus every live campaign's average daily spend, compared against `dailyCap`, and x 30.4 against `monthlyBudget`. A live campaign's average daily spend is its spend over the last 7 days divided by 7, not by the days that have figures. Over either shows a warning on the build, and Claude refuses to build it.
- **Seasonal guard for builds**: when `build.season` is set (`{ label, from, to }`, month-day `MM-DD`), warn when any day of the build's run (start to end) falls outside it, or when today is outside it, the build is about to go on and its start date has arrived (or it has none). A paused campaign cannot spend before its start date. A season can cross the year end (`11-15` to `01-10`). A run of more than 366 days counts as outside.

`model.js` is pure functions, `window.AD.model`. It also runs under Node (`module.exports`). It exposes:

- `PLATFORMS`, `COPY`, `normalise`, `validate`, `money`, `symbol`, `pct`, `roasReason`, `figureAge`
- `rangeTotals(data, {from, to, platform, campaignId})`, `weekStart(date, weekStarts)`, `weeks(data, n, today)`, `thisAndLast(data, today)`
- `byPlatform(data, range)`, `byCampaign(data, range)`, `light(totals, target)`, `pace(data, today)`, `capBreaches(data, today)`, `buildChecks(data, build, today)`
- `health(data, today)`, `todo(data, today)`, `newBuild(platform)`, `suggestionCounts(data)`

## Data file: `apps/ads/data/ads.json`

Ships as exactly this:

```json
{
  "version": 1,
  "settings": {
    "businessName": "",
    "ownerName": "",
    "currency": "GBP",
    "weekStarts": 1,
    "result": { "name": "", "plural": "", "kind": "", "worth": null, "closeRate": null },
    "targetCostPerResult": null,
    "platformTargets": {},
    "monthlyBudget": null,
    "dailyCap": null,
    "weeklyCap": null,
    "seasons": []
  },
  "platforms": {},
  "campaigns": [],
  "figures": [],
  "builds": [],
  "summaries": [],
  "suggestions": [],
  "wins": [],
  "imports": [],
  "activity": []
}
```

Shapes (every id from `ui.makeId`, every date `YYYY-MM-DD`, every timestamp ISO):

- `settings.seasons`: the business's seasons, `[{ label, from: "MM-DD", to: "MM-DD" }]` (a season may cross the year end), default `[]`. `normalise` drops any that isn't a real season. Setup step 4 saves them, the Settings pop-up edits them, and `todoList` reads them for "Draft a campaign for <season>" unless seasons are passed in.
- `settings.result`: `name` "enquiry" and `plural` "enquiries" (used in every label, so the screen says "Cost per enquiry"). `kind` is one of `lead`, `call`, `booking` or `sale`. `worth` is what one new customer is worth in pounds. `closeRate` is 0 to 1, how many results become customers (both null when `kind` is `sale`, because sales carry their own value).
- `platforms.<key>`: `{ "on": true, "how": "connected"|"export"|"none", "accountName": "", "accountId": "", "connectedAt": null, "lastRefresh": null }`. A missing key means off.
- `campaigns[]`: `{ id, platform, platformId, name, status: "on"|"paused"|"ended", objective, dailyBudget, startedAt, builtBy: "claude"|"you", buildId: null, url }`. These are campaigns as they are in the account, copied in by Claude when it refreshes.
- `figures[]`: `{ date, platform, campaignId, spend, results, value, clicks, impressions }`, one row per campaign per day. `value` is null unless the platform reports it. Claude never writes a total. Same campaign and date replaces the row (no doubles); the app's `normalise` keeps the last of any duplicate.
- `builds[]`:

```json
{
  "id": "b_x", "platform": "meta", "name": "New patient check-up, autumn",
  "objective": "leads", "status": "draft",
  "audience": { "locations": ["Marlow", "15 miles"], "ageMin": 25, "ageMax": 65, "interests": [], "keywords": [], "negativeKeywords": [], "notes": "" },
  "budget": { "daily": 15, "start": "2026-11-03", "end": "2026-11-30" },
  "season": { "label": "Autumn", "from": "09-01", "to": "11-30" },
  "ads": [ { "id": "a_x", "headline": "", "primaryText": "", "description": "", "cta": "Book now", "url": "", "media": [] } ],
  "why": "one or two plain sentences from Claude",
  "checks": [ { "id": "c_x", "text": "Check the landing page shows the autumn offer", "done": false } ],
  "refs": { "campaignId": "", "url": "", "file": "", "sheet": "" },
  "request": null, "taskId": null,
  "createdAt": "", "updatedAt": "", "approvedAt": null, "builtAt": null, "switchedOnAt": null
}
```

  - `status`:
    - `draft`: Claude wrote it, waiting for the owner.
    - `approved`: the owner pressed Approve.
    - `building`: the job is running.
    - `in-account`: on Meta, paused in the account.
    - `ready-to-import`: on Google, the file is written.
    - `live`: the owner pressed "I've switched it on".
    - `dropped`: hidden, never deleted.
  - `ads[].media` is a list of media ids (`m-xxxxxx.jpg`), files saved through the shared v7 helper into `apps/ads/data/media/`. Same file name rules and helper routes as Content Machine OS.
  - `request`: `null`, or `{ "kind": "write"|"rewrite"|"build", "note": "", "at": iso }`. The app sets it and calls the job, and Claude clears it.
  - `taskId`: `null`, or the id of the switch-on task `send-to-task-list` wrote in Task List OS, so a build is never sent twice. `normalise` makes it `null` unless it is a non-empty string.
  - Google builds have exactly 3 ads. Ads 1 and 2 have a headline, main words (`primaryText`) and description. Ad 3 has a headline only, so a Google build has 3 headlines and 4 descriptions. The drawer hides ad 3's main words and description boxes.
- `summaries[]`: `{ id, weekStart, text, createdAt }`. One per week, newest first. Claude's words only. The app shows that week's figures beside them. The text never contains a figure the app doesn't show. Claude gets figures by running `node apps/ads/app/report.js week [YYYY-MM-DD]`, which prints the app's own numbers.
- `suggestions[]`: `{ id, kind: "pause"|"budget"|"test"|"words"|"audience"|"landing"|"other", platform, campaignId, title, why, status: "new"|"approved"|"dismissed"|"done", createdAt, decidedAt, taskId: null }`. Approve makes it a task for the owner. Claude does not carry it out.
- `wins[]`: `{ id, dealId, name, value, wonAt, campaignId: null }`. Claude copies these, read only, from Pipeline OS won deals whose source is ads.
- `imports[]`: `{ id, at, platform, how: "connected"|"export", file, from, to, rows, note }`
- `activity[]`: `{ at, what, ref }`, newest first, capped at 200.

`validate(d)` throws a plain message if any list is the wrong type.

## The page (one page, rail tabs, like Content Machine OS)

The sidebar shows one page, **Ads**. The rail on the left holds **Overview | Campaigns | New campaigns | This week** plus a **Health check** button. New campaigns shows a count of builds waiting on the owner.

On the right of the rail: a date range switch (**This week | Last 4 weeks | This month | Last 12 weeks**), a platform filter (All, Meta, Google), **Refresh figures** (runs the `update-my-ads` job) and **New campaign** (primary, runs `build-a-campaign` with a short "What's it for?" box). A gear opens the Settings dialog. Addresses: `#overview`, `#campaigns`, `#builds`, `#week`, `#health`. Number keys 1 to 5.

### Setup card (shared v6)

Shown before setup, meaning no `settings.result.name` and no platform on. Overview and the first Home box show **"Let's set up your ads"**: open this folder in the Code tab of the Claude desktop app and type `/setup`, with a copy button. Every other empty state says what fills it. With platforms on but no figures, it says **"No figures yet. Press Refresh figures, or drop a report export into files/04-marketing/ads/exports and say: update my ads."**

### Overview

- **Tiles**: Spend, Results (named), Cost per result against target (with the light), Return on ad spend (marked "estimated" when it is), Pace this month (spend so far of budget, projected month end). Each tile shows the change against the previous range of the same length.
- **By platform**: a card each with the same 4 figures and the light, and the counting note under them.
- **Trend**: 12 weeks, hand-built SVG, light and dark, following the `dataviz` skill: spend as bars, cost per result as a line, the target as a dashed line, with a text table fallback for screen readers.
- **Waiting on you** strip: builds to review, builds paused in your account to switch on, suggestions to decide, cap breaches. Each is a button to its view.

### Campaigns

A table: light, name, platform tag, status (on, paused, ended), spend, results, cost per result, return, and the change against the previous range. Click a row for a side drawer:
- that campaign's 12-week figures (small SVG)
- its suggestions
- "Open in Ads Manager" or "Open in Google Ads" (the campaign `url`, or the platform's manager link)

Sortable columns. On phones it becomes cards. No sideways scrolling.

### New campaigns

Cards for every build not `dropped`, grouped Waiting for you (`draft`), Ready to build (`approved`), Switch it on (`in-account` and `ready-to-import`) and Running (`live`, last 8). Click a card for the drawer, where everything is edited in place:

- **Top**: name, platform, objective, dates, daily budget (the app shows the monthly equivalent and the budget guard result) and the season (with the seasonal guard result).
- **Who sees it**: locations, ages, interests (Meta) or keywords and negative keywords (Google), notes.
- **The ads**: each with headline, main words and description, with character counts against the platform limits in `AD.LIMITS`, plus button, link, and pictures or videos (drop zone, same media code as Content Machine OS).
- **A preview** of each ad: the business name, the cover picture and the words cut where the platform cuts them.
- **Claude's why**, and the **checks** list (tick boxes).
- **Buttons by status**:
  - `draft`: **Ask Claude to change it** (note box, `rewrite`), **Approve**, **Drop** (with Undo).
  - `approved`, Meta: **Build it in my account, paused** (`request.kind = "build"`, runs `build-in-account`). The line under it reads: "Claude creates it switched off. Nothing spends until you switch it on in Ads Manager."
  - `approved`, Google: **Make the import file** (same job). The line under it reads: "Claude writes a file you open in Google Ads Editor. It arrives paused."
  - `in-account`: **Open in Ads Manager** and **I've switched it on** (sets `live` and `switchedOnAt`, asks to confirm).
  - `ready-to-import`: **Open the build sheet** (the file in `refs.sheet`), **Open Google Ads**, **I've switched it on**.
  - The budget guard or seasonal guard failing disables the build button and says why in plain words.

A 503 from the job says plainly: "Claude isn't switched on for the app. Open the folder in Claude and say: build my approved campaigns."

### This week

- The newest summary, with the app's figures for that week beside it (this week against last, best and worst campaign by cost per result).
- **Write this week's summary** (runs `how-did-the-ads-do`) and earlier weeks below.
- **Suggestions**: cards with kind tag, title, why, the campaign. Buttons **Approve** (status approved, and when Task List OS is attached the suggestion is also written as a suggested task by the job, see Attaching) and **Not now** (dismissed, Undo). An approved suggestion later shows **Done** when the owner has made the change.
- **What should I change?** runs `what-should-i-change`.

### Health check

5 or 6 checks, each Healthy, Watch or Needs action, with a value and a target line:

- figures up to date (newest figure within 3 days)
- cost per result against target (last 4 weeks)
- pace against monthly budget
- cap breaches in the last 14 days
- tracking: any campaign with spend over 2 x target and 0 results in 14 days ("check the results are being counted")
- builds waiting on you for over 7 days

Below: an 8-week bar chart of results per week. One line: "Claude reads your figures. It never changes anything in your ad accounts."

### Home boxes (`home-boxes.js`, all `defaultOn: false`)

- **Ads this week** (size 2): the tiles in small, with the setup card before setup.
- **Waiting on you** (size 1).
- **Cost per result trend** (size 1): a sparkline against target.

## Claude jobs: `apps/ads/claude-jobs.json`

| job | label | prompt points at |
|---|---|---|
| `update-my-ads` | refreshing your ad figures | `.claude/skills/update-my-ads` |
| `build-a-campaign` | drafting a new campaign | `.claude/skills/build-a-campaign` (draft only; the note from the New campaign box is in the newest build's `request.note` or passed as `"brief"`; follow the content kit's way of passing a note) |
| `write-campaign` | changing your campaign | `.claude/skills/build-a-campaign` for builds with `request.kind` write or rewrite |
| `build-in-account` | building your approved campaigns, paused | `.claude/skills/build-in-account` for builds with `request.kind = "build"` |
| `how-did-the-ads-do` | writing this week's summary | `.claude/skills/how-did-the-ads-do` |
| `what-should-i-change` | looking for changes worth making | `.claude/skills/what-should-i-change` |
| `send-to-task-list` | adding it to your task list | the Task List section of `apps/ads/ATTACH-CLAUDE.md`: a suggested task for each approved suggestion and each `in-account` or `ready-to-import` build with no `taskId`, ids recorded so nothing is sent twice. The app runs it after Approve in This week and after a successful `build-in-account`, only when `apps/installed.json` lists `task-list` (read once, the first time it is needed). Without Task List OS nothing is run |

Each prompt ends "Never switch anything on, never change a campaign that already exists in an ad account. Change nothing else." and keeps to the tool's own data file, `files/04-marketing/ads/` and `context/`.

## Skills (`.claude/skills/`)

Shared skills are copied unchanged from the template:

- `connect-a-tool`, `file-it`, `human-email`, `keep-context-fresh`, `match-my-brand`
- `open-task-list`, `polite-chaser`, `setup`, `sort-brain-dump`, `write-like-me`

The tool's own skills (names must not start with `ads`, which is claude-ads' prefix):

| skill | people say | does |
|---|---|---|
| `update-my-ads` | "update my ads", "refresh my ad figures", "here's my ads report" | Reads each connected account (Meta connection, Google Ads connection), read-only tools only, the last 90 days on first run, then from the last figure date minus 3 days (late conversions). Or reads the newest export in `files/04-marketing/ads/exports/` (column guide in `references/exports.md`, with the exact clicks to export from Meta Ads Manager and Google Ads, anything unchecked marked "to check"). Writes `campaigns`, `figures` and `imports`. Reads Pipeline OS wins when attached. Never types a total |
| `build-a-campaign` | "make me a campaign", "build an ad for", "new campaign for" | Reads `context/ads.md`, `context/business.md` and `context/voice.md`. Uses the claude-ads skills `ads-plan`, `ads-create` and `ads-launch --draft` (and `ads-math` for the budget, `ads-dna` once for the brand) when installed; if not, it works from `references/campaign-basics.md`. Writes one complete build per platform asked for, status `draft`, with audience, 2 or 3 ads, budget inside the caps, dates, season, why and checks. Uses the seasonal guard. Never touches an ad account |
| `build-in-account` | "build my approved campaigns", "put it in my account" | For builds with `request.kind = "build"` and status `approved`. **Meta**: uses only the Meta connection's create tools. It creates the campaign, ad set and ads with status PAUSED on every object, reads them back and confirms every one is paused (if any is not, stop, tell the owner in plain words and set nothing live). Then it fills `refs`, sets `in-account` and `builtAt`. It never calls a tool that activates, updates, pauses, re-budgets or deletes (on Meta's connection these include `ads_activate_entity` and `ads_update_entity`; check the tool list each time and treat anything that changes an existing object as off limits). **Google**: writes `files/04-marketing/ads/<build-name>-google-ads-editor.csv` in Google Ads Editor's import columns, with Campaign status Paused (column guide in `references/google-ads-editor.md`, exact columns marked "to check"), plus `<build-name>-build-sheet.md`, click by click, for building it by hand in Google Ads instead. Sets `ready-to-import`. Refuses when the budget or seasonal guard fails: it runs `node apps/ads/app/report.js checks <id>` and stops when it says BLOCKED, with no sums of its own |
| `how-did-the-ads-do` | "how did the ads do", "ads this week", "weekly ads summary" | Runs `node apps/ads/app/report.js week`, then writes 4 to 6 plain sentences: what happened, what worked, what didn't, and what to watch. Quotes only numbers the report printed. Adds or replaces this week's summary |
| `what-should-i-change` | "what should I change", "what's wasting money", "any suggestions" | Uses the report (and `ads-optimize --draft` or `ads-audit` from claude-ads if installed), adds up to 5 suggestions with a plain why, never duplicating an open one. Never makes the change |
| `my-ads-check-in` | "what's waiting on me in ads", "anything to switch on" | Reads `AD.model.todo` (via `report.js todo`) and says it plainly |

The connection rules live once in `.claude/skills/build-in-account/references/connections.md`:

- Meta's own connection (address `https://mcp.facebook.com/ads`, open beta since 29 April 2026, reaching accounts in stages) creates new campaigns paused, and also has tools that switch things on and edit live campaigns.
- Google's own connection reads only.
- Mark tool names and anything not seen first hand "to check".

Every skill reads `context/` first, writes only through the data file (keeping the shapes, adding to `activity`), and never switches on, edits, pauses or deletes anything in an ad account. It never stores tokens, passwords or customer lists.

### `apps/ads/app/report.js` (Node, no packages)

`node apps/ads/app/report.js week [date]`, `todo` and `checks <buildId>` load `apps/ads/data/ads.json` and `model.js` and print plain text of the app's own numbers. Allowed in settings.

- `todo` lists what is waiting and ends with how old the newest figures are ("Newest figures: 2 days old").
- `checks <buildId>` prints `buildChecks` in plain words: the budget room per day and per month, each warning, and a last line `Result: OK` or `Result: BLOCKED`. `build-in-account` runs it and refuses on BLOCKED, with no sums of its own.

## Setup (`setup/`)

The shared steps come first, as in the template. Then these, each in its own file, skippable where it says:

1. `setup/ads-01-install-claude-ads.md`: runs `bash setup/scripts/install-claude-ads.sh` (Windows: `powershell -ExecutionPolicy Bypass -File setup\scripts\install-claude-ads.ps1`). The script:
   - fetches the fork at the pinned tag into a temporary folder outside the workspace (git clone, or the tag's zip download when git isn't there)
   - checks the commit is the pinned one
   - runs its installer with `--source=local --no-deps`, pointing the skill and agent folders at this folder's `.claude/skills` and `.claude/agents`
   - copies `LICENSE` and `THIRD_PARTY_NOTICES.md` into `.claude/skills/ads/`, and writes `.claude/skills/ads/INSTALLED-BY-ADS-OS.md` (where from, which version, the MIT licence line)
   - removes its own temporary folder

   If it fails, Ads OS still works from `references/campaign-basics.md`; say so and carry on.
2. `setup/ads-02-where-your-ads-are.md`: asks which of Meta and Google they use or want to use. **Connect your Meta ad account** (skippable): add Meta's connection in the Claude app, click by click, in `setup/connections/meta-ads.md`. **Connect your Google Ads account** (skippable): `setup/connections/google-ads.md`. Explain once: "Claude needs at least one connected account to build campaigns for you. Without one, it can still read your figures from a report you download." Claude tests each connection with one read (the account name and the campaigns) and saves `platforms`. If neither is connected, it walks through the report export for each platform.
3. `setup/ads-03-your-customer.md`: their ideal customer (who, where, what they need, what makes them pick you) and whether they've run ads before. If they have: where, roughly what they spent, what happened and what they'd never do again. Saves `context/ads.md`.
4. `setup/ads-04-budget-and-results.md`:
   - monthly budget, daily and weekly caps (Claude suggests caps from the budget; the owner decides)
   - what counts as a result (a form filled in, a call, a booking, a sale) and its name
   - for leads, calls and bookings: what a new customer is worth and roughly how many results become customers
   - target cost per result (Claude works out a sensible starting point with `ads-math` and shows the sums, the owner decides)

   Saves `settings`.
5. `setup/ads-05-first-look.md`: runs `update-my-ads` if anything is connected or exported, then `how-did-the-ads-do` and `what-should-i-change`. It offers `build-a-campaign` ("Want Claude to draft your first campaign? It stays a draft until you approve it.") and opens the app.
6. `09-check-and-hand-over.md`, adapted.

The answers also go into claude-ads' own setup profile where it keeps one, so nobody is asked twice. To check during the build: where `ads-setup` writes its profile.

## Context

New `context/ads.md` (headings only): Ideal customer, Where they are, Ads we've run before, What happened, What we never do, Budget and limits, What counts as a result, Seasons that matter.

## Attaching (`ATTACH-CLAUDE.md`, `toolkit.json`)

- **Reads:**
  - Pipeline OS deals won whose source is ads, written into `wins` (read only)
  - `context/`
- **Sends**, each waiting for the person's click, written the way Content Machine OS writes into Task List OS (copy its pattern):
  - Task List OS: a suggested task for each approved suggestion ("Pause the Summer whitening ad in Ads Manager"), and for each build waiting to be switched on ("Switch on: New patient check-up, autumn"). The app asks for this straight away, through the `send-to-task-list` job, after Approve and after a successful build.
  - Pipeline OS: new leads from Meta lead forms read through the connection, as suggested deals, following Pipeline OS's suggestion pattern. Only when Pipeline OS is attached and the connection gives lead details. Never kept anywhere else.
  - Money View OS: Money View reads Ads OS spend itself (its spec turns it into a suggested outgoing, `source: "ads"`). Ads OS writes nothing into Money View. The file gives it `figures` by day and `settings.monthlyBudget`.

## catalogue.json (shared part, changed in this kit)

Change the `ads` entry to name **Ads OS** and repository `ads-os`, with description: "Your Google and Meta ads on one plain-English screen. Claude builds new campaigns switched off and suggests changes, and nothing spends until you switch it on." Also bring the catalogue in line with the other kits' pending renames:
- `proposals`: name "Proposal OS", repository `proposal-writing-os`, Proposal OS's own description
- remove `file-finder`

Note all of it in `maintainers/SHARED-CATALOGUE-RENAME.md`; it is copied to the other kits by pull request.

## Settings (`.claude/settings.json`)

Allow:
- `Read(./**)`
- Edit and Write on `./apps/ads/data/**`, `./apps/home/data/**`, `./context/**`, `./files/**` and `./skills-to-upload/**`
- Edit `./setup/progress.md`
- `WebSearch` and `WebFetch`
- the start scripts
- `Bash(bash setup/scripts/install-claude-ads.sh)` and its Windows twin
- `Bash(node apps/ads/app/report.js:*)`

**No ad account tool is pre-approved**, so Claude Code asks the owner before every call to a Meta or Google tool. Nothing that sends, posts, switches on or deletes.

## Files and layout

```
apps/ads/
  CLAUDE.md  ATTACH-CLAUDE.md  claude-jobs.json  menu.json  home-boxes.js  index.html
  data/ads.json
  app/ app.css views.css app.js model.js report.js components.js charts.js drawer.js media.js settings.js
       view-overview.js view-campaigns.js view-builds.js view-week.js view-health.js
setup/ads-01..05, setup/scripts/install-claude-ads.sh and .ps1, setup/connections/meta-ads.md and google-ads.md
Open Ads OS.html
```

Remove `apps/content/`, the content skills, `context/content.md`, the content setup steps and `Open Content Machine.html` (this is a fresh kit, nothing to archive). Keep every shared part byte for byte, except `catalogue.json` as above and `installed.json` (only `ads`, with `"media": true`).

## Release check (`maintainers/make-release.sh`)

Adapt from the template. `apps/ads/data/ads.json` must equal the empty file above. It refuses:
- filled `context/ads.md`
- installed claude-ads files (`.claude/skills/ads/`, `.claude/skills/ads-*/`, `.claude/agents/`, `.claude/skills/.claude-ads-*.manifest`), which are also in `.gitignore`
- anything in `apps/ads/data/media/` except `.gitkeep`
- anything in `files/04-marketing/ads/` except READMEs
- demo code or real data

## Tests

`maintainers/TESTING.md` adapted. `maintainers/test-model.js` uses plain Node assertions for:
- `rangeTotals`, `costPerResult`, `roas` (reported, estimated, null)
- `light` (all 4 states)
- `weeks` (week start, gaps)
- `pace`, `capBreaches`
- `buildChecks` (budget and seasonal guard across a year end, for example a season from 11-15 to 01-10)
- `todo`, `health`
- duplicate figure rows

Plus `report.js` output against a fixture.

## Round 2, 22 October 2026 (George, after seeing the demo)

This section overrides anything above where they differ. George wants owners to use Ads OS **instead of** Meta Ads Manager and Google Ads, with Claude taking the work off them.

### George's decisions (22 October)

1. **Owner's click, Claude acts.** On Meta, Claude may switch on a paused campaign, pause a campaign or an ad, and change a daily budget, but only when the owner presses the button in the app and confirms that exact change in a pop-up. Claude does that one change, reads it back, and records what it found. It never acts on its own, never goes over the owner's limits, and never deletes. This replaces decision 2 of 21 October ("never switches anything on, never changes a live campaign").
   - **Google:** Google's own connection only reads, so every Google change stays a click-by-click task with an "Open Google Ads" link, and new Google campaigns stay an import file.
2. **No logos.** The brand rules were checked on 22 October:
   - Google allows its logo only for formal partners.
   - No Meta rule allows a third-party tool to show its logo for an integration.

   So the platform switch is 3 buttons, **All | Meta | Google Ads**, each a clear coloured tag with the platform's name in plain words. Never imply partnership or endorsement.

### Data additions (all optional, `normalise` fills defaults; ships empty as before)

- `campaigns[].ads[]`: `{ id, platformId, name, headline, primaryText, description, cta, url, media: [file names], status: "on"|"paused" }`. Claude reads them when it refreshes figures. `media` files are saved into `apps/ads/data/media/` by Claude through the same file name rules, and only when the connection hands over the picture (to check). Text only otherwise.
- `adFigures[]`: `{ date, platform, campaignId, adId, spend, results, value, clicks, impressions }`, one row per ad per day, used only for the per-ad figures in the carousel. Campaign totals always come from `figures`, never from adding up `adFigures`.
- `campaigns[].prediction` and `builds[].prediction`: `{ costPerResult, resultsPerWeek, spendPerWeek, from: date, madeAt, basis: "plan"|"analysis", assumptions: [plain sentences] }`.
  - Claude fills it from claude-ads' `ads-math` forecast when it drafts a build (`basis: "plan"`), or from "Analyse campaign" for a campaign that has none (`basis: "analysis"`, `from` = the analysis date).
  - A build's prediction is copied to its campaign when it goes live.
- `campaigns[].request`: `null` or `{ kind: "analyse", note, at }`. The app sets it and calls the job. Claude clears it.
- `analyses[]`: `{ id, campaignId, at, summary, working: [text], wasting: [text], couldNotSee: [text] }`, newest first. Words only; the figures beside it come from the app. Any suggestions it makes go into `suggestions` with that `campaignId`.
- `actions[]`, the owner-approved account changes:
  - Shape: `{ id, kind: "switch-on"|"pause"|"budget", platform, campaignId, buildId, adId, budgetFrom, budgetTo, status: "requested"|"doing"|"done"|"failed", requestedAt, doneAt, readBack: "", note: "" }`.
  - Only `platform: "meta"`.
  - The app creates it with status `requested` after the owner confirms the pop-up, records the yes in `apps/ads/data/approvals.json` (which ships empty and is listed in `apps/installed.json` and `toolkit.json` `dataFiles`), then opens Claude Code on screen with `make-account-change` typed in. It is no longer a background job. A missing or unknown status is read as `failed`.
  - Claude sets `doing`, then `done` with `readBack` ("Campaign is now ACTIVE, daily budget £15") or `failed` with a plain `note`.
  - A `switch-on` of a build also sets the build `live` and `switchedOnAt` when done.
- `builds[].fromCampaignId` and `builds[].brief`. `brief` is `{ audience: "same"|"change", audienceNote, budget: "same"|"change", daily, start, end, words: "keep"|"fresh"|"mix", note }`, filled by the Run campaign questions.

### Model additions (`model.js`, pure, tested)

- `predictionScore(data, campaign, today)` returns `{ state: "ahead"|"on-track"|"behind"|"too-early"|"none", score, resultsRatio, costRatio, actual: {resultsPerWeek, costPerResult}, predicted, days }`.
  - It uses the campaign's figures from `prediction.from` to yesterday. The result is `too-early` under 7 days, or with no results and spend under 2 x the predicted cost per result.
  - `resultsRatio = actual results per week / predicted`; `costRatio = predicted cost per result / actual`. Each is capped at 2.
  - `score = round(100 x average of the two)`, so 100 means as predicted.
  - Ahead is 110 or more, Behind is under 90, and On track sits between.
  - Shown as "Score 112: ahead of what Claude predicted", with the sums on hover or click.
- `adsFor(data, campaignId)` returns the campaign's ads with each ad's totals for a range from `adFigures` (or null figures).
- `actionChecks(data, action, today)`: for `budget`, the same limits as the budget guard (the new daily plus the other live campaigns' 7-day average against `dailyCap` and the monthly budget); for `switch-on`, the build's `buildChecks`. Returns `{ ok, warnings }`. The app blocks the button and Claude refuses when not ok.
- `todoList(data, today)` returns `{ claude: [...], you: [...] }`, each item `{ key, label, why, ref, job | action | open }`.
  - **Claude can do:**
    - Refresh figures (figures over 3 days old)
    - Analyse <campaign> (red light, or Behind, or no prediction)
    - Write this week's summary (none for this week)
    - Look for changes (no suggestions in 7 days)
    - Draft a campaign for <season> (a season in `context` coming up; skip if unknown)
    - Switch on <build> (`in-account`, Meta)
    - Pause <campaign> (an approved pause suggestion on Meta)
  - **You need to:**
    - Review <draft>
    - Add a photo to <build ad>
    - Import <Google build> into Google Ads Editor
    - Make <approved suggestion> in Google Ads (Google)
    - Tell Claude what a new customer is worth (no worth set)
    - Connect your Meta account (Meta missing or not connected)
    - Answer a question Claude left (any `needs` text on a build)

  Each "you" item says what to give Claude. Every item has a stable key so the count is the same everywhere.

### Page changes

- **Rail:** Overview | Campaigns | New campaigns | This week | **To do** (with its count), plus Health check. To do is number key 5 and Health check moves to 6. Overview's "Waiting on you" strip links to To do.
- **Platform switch:** All | Meta | Google Ads on Overview and Campaigns, as coloured name tags (above).
- **Campaign panel (click any campaign row or card):**
  - **Top:** name, platform tag, status, light, the **prediction score** (state, score, and "Claude predicted £24 per enquiry and 4 a week; it's doing £21 and 5 a week"), and the 12-week chart.
  - **Ads:** a **carousel** of every ad in the campaign, with previous and next buttons, arrow keys, swipe on phones, dots and "2 of 5". Each slide shows the ad as it reads on the platform (business name, picture if any, headline, words, button) and that ad's spend, results and cost per result for the chosen range, plus its status. Empty state: "Claude reads your ads' words the next time it refreshes your figures."
  - **Buttons:**
    - **Analyse campaign** (sets `request`, runs `analyse-campaign`, shows the newest analysis in the panel)
    - **Run campaign** (opens the questions, below)
    - On Meta: **Pause campaign** or **Switch on** and **Change daily budget**, each opening the confirm pop-up
    - On Google: "Open Google Ads" plus "Add to my task list" for the same changes
- **Run campaign questions (pop-up, one screen, plain):**
  1. Who should see it: Same people as last time (shows them) or Change them (a box).
  2. Budget: Same (£x a day) or Change (number, with the budget guard live).
  3. Dates: start and end.
  4. The ads: Keep the best ones, Write fresh ones, or A mix.
  5. Anything else for Claude (a box).

  "Draft it" creates a build (`draft`, `fromCampaignId`, `brief`, `request.kind = "write"`) and runs `write-campaign`. The usual Approve, build paused, then **Switch on** (now a button for Meta) flow follows.
- **Confirm pop-up for account changes:** states the exact change in one sentence ("Switch on Christmas gift vouchers in your Meta account. It starts spending up to £6 a day from 15 Nov."), shows the limits check, and has **Yes, do it** and Cancel. Then the button shows "Claude is doing it" and the result line (read back) when done.
- **New campaigns:** `in-account` Meta builds get **Switch it on** (confirm pop-up, action). "I've switched it on myself" stays as a small link for people who used Ads Manager. Google `ready-to-import` keeps "I've switched it on".
- **To do tab:** 2 columns (one on phones). **Claude can do this** has a **Do it** button per item that runs the job or opens the confirm pop-up. **You need to** has each item's button (Open, Add photo, Open Google Ads, Tell Claude), and a short "what to give Claude" line.
- **Words on screen** change from "Claude never switches anything on" to "Nothing changes in your ad account until you press the button and say yes."

### Jobs added

| job | label | skill |
|---|---|---|
| `analyse-campaign` | analysing your campaign | `.claude/skills/analyse-campaign` for campaigns with `request.kind = "analyse"` |
| ~~`make-account-change`~~ | (removed from the background jobs: it runs on screen in Claude Code after the owner's yes) | |

Each prompt still ends with a closing line, now: "Change only what the person approved in the app, and nothing else."

### Skills added or changed

- `analyse-campaign` ("analyse my campaign", "how's the whitening campaign doing"):
  - Reads the campaign's figures through `report.js campaign <id>` (new command: totals, weekly figures, light, prediction score).
  - Uses claude-ads `ads-audit` or `ads-meta`/`ads-google` scoped to that campaign when installed.
  - Writes an analysis, sets a prediction if none (with `ads-math`, assumptions listed), and adds up to 3 suggestions. Never changes the account.
- `make-account-change`: for each `requested` action with a matching confirmation in `approvals.json`:
  - Runs `report.js action <id>` (new command, prints `actionChecks` and whether the owner's confirmation matches, OK or BLOCKED) and refuses if blocked.
  - Does exactly that one change with the Meta connection's tool for it (to check: tool names), and nothing else.
  - Reads it back and writes `readBack`.
  - Never more than one change per action. Never deletes. Never touches Google.
- `update-my-ads` also reads each campaign's ads (words, status, picture where offered) and ad-level daily figures.
- `build-a-campaign` writes `prediction` with every build (from `ads-math`, assumptions listed) and follows `brief` and `fromCampaignId` when present (reuse the audience and best ads as asked).
- `build-in-account` is unchanged (still creates paused).
- `my-ads-check-in` reads `report.js todo`, which now prints `todoList`.
- The hard rules in every skill, START-HERE, README, CLAUDE.md, docs/PRIVACY-AND-SAFETY.md and the setup steps change to decision 1 above. `.claude/settings.json` still pre-approves no ad account tool, so Claude Code also asks the owner before every call.

### Deliberate choices (22 October, after review)

- **Analyse is hidden** for 7 days after an analysis, and while one is asked for.
- **Switch on and Pause are hidden** while an action for them is in flight (`requested` or `doing`).
- **The worth item** ("Tell Claude what a new customer is worth") is only for result kinds other than `sale`, because sales carry their own value.
- **A budget decrease always passes** `actionChecks`, because it can't breach a limit.
- **Add a photo is Meta only**, because Google search ads carry no pictures.
- **One count everywhere:** the sidebar badge, the To do rail tab, Overview's "N things on your To do list" button and Home's box all use `todoList` (Claude's list plus yours).
- **Pause is refused** for a campaign or ad that is already paused, and for an ad that isn't in the campaign.

### Demo

Rebuild with the Marlow Dental campaigns carrying 2 to 5 ads each (words, some with pictures), ad figures, predictions (one ahead, one on track, one behind), an analysis, and a few actions done. The stand-in answers the new jobs.
