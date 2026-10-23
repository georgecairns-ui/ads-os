# Testing Ads OS

How to test the whole thing as a customer would, without touching the repo. Also follow section 5 of `SHARED-V3-CHANGES.md` and the testing sections of `SHARED-V4-CHANGES.md`, `SHARED-V5-CHANGES.md`, `SHARED-V6-CHANGES.md` and `SHARED-V7-CHANGES.md` for the shared parts.

Everything that touches a real ad account needs a test account, never a customer's. Anything below marked "to check" has not been run by the person who wrote this file.

## 1. The model's own tests

Run these first, from the repo root. They need Node only and touch nothing:

```bash
node maintainers/test-model.js
```

It runs plain assertions on `apps/ads/app/model.js`, and on the output of `apps/ads/app/report.js` against a fixture. It must print no failures. `make-release.sh` runs it too. If you change a rule in `model.js`, change the test in the same commit.

What the tests must cover, so a future change can't quietly break a rule:

- **`rangeTotals`**: spend, results, value, clicks and impressions for a date range, a platform and a campaign; an empty range gives 0, not an error.
- **`costPerResult`**: `spend / results`, and `null` when results is 0.
- **`roas`**: from the platform's `value` when it is there ("reported"); otherwise from `results x settings.result.worth x settings.result.closeRate` ("estimated"); `null` when neither exists or spend is 0. The real return from Pipeline OS wins (`wins`), labelled "from customers you've won".
- **`light`**: all 4 states: green at or under target, amber up to 25% over (and exactly 25% over), red beyond that or with no results and spend at least 2 x target, and grey "Too early to say" with no results and spend under 2 x target or under 7 days of figures. A platform target in `platformTargets` beats the overall one.
- **`weeks`** and **`weekStart`**: weeks start on `settings.weekStarts` (Monday and Sunday), gaps give empty weeks, and a day just after midnight in summer is in the right week.
- **`pace`**: spend so far this month against the budget, the projected month end (spend so far / days elapsed x days in the month), and a month with no budget.
- **`capBreaches`**: a day over `dailyCap` and a week over `weeklyCap`, and none when the caps are empty.
- **`buildChecks`**: the budget guard (the build's daily budget plus every live campaign's average daily spend over the last 7 days against `dailyCap`, and x 30.4 against `monthlyBudget`) and the seasonal guard, including a season that crosses the year end (`11-15` to `01-10`) with a start and end on either side of it, a start outside the season, and today outside the season for a build about to go on.
- **`todo`** and **`health`**: each of the 6 health checks (figures up to date, cost per result against target, pace, cap breaches, results being counted, builds waiting over 7 days) at the documented thresholds, an empty file, and what the Waiting on you strip lists.
- **`predictionScore`** (round 2): all 5 states (`ahead` at 110 or more, `on-track` from 90 to 109, `behind` under 90, `too-early` under 7 days or with no results and spend under 2 x the predicted cost per result, and `none` with no prediction); each ratio capped at 2; the score counting only from `prediction.from` to yesterday; a prediction with only one of cost per result and results a week; and that 100 means exactly as predicted.
- **`adsFor`**: a campaign's ads with each ad's totals from `adFigures` for a range, null figures when there are none, and a campaign's own totals never taken from adding up `adFigures`.
- **`actionChecks`**: a `budget` change that fits, one that takes the day over `dailyCap`, one that takes the month over `monthlyBudget` (the other live campaigns' 7-day average counted), a `switch-on` that fails its build's seasonal guard, and `{ ok, warnings }` in each case.
- **`todoList`**: both lists (`claude` and `you`) for each item type in the spec, a stable `key` for each, the same count everywhere, an empty file, and the seasonal item skipped when no season is known.
- **Duplicate figure rows**: `normalise` keeps the last row for the same campaign and date.
- **`validate`**: throws a plain message when any list is the wrong type.
- **`report.js`**: `week` and `todo` (which now prints `todoList`) print the app's own numbers for a fixture, and run cleanly on the blank data file. `campaign <id>` prints a campaign's totals, weekly figures, light and prediction score. `action <id>` prints the limit checks for an approved change and ends `Result: OK` or `Result: BLOCKED`. An unknown id gives a plain message and a non-zero exit.

## 2. Make a fresh copy

Never test inside the repo: setup writes real details into it. Build the release zip and unzip it somewhere else:

```bash
bash maintainers/make-release.sh
```

Then unzip `dist/ads-os.zip` into a test location, for example `Documents/Ads OS test`. Each test run starts from a fresh unzip. Then check the release script itself refuses what it should, on a scratch copy of the repo, by adding each of these and running it (each must stop with a plain message):

- a non-empty `builds` list in `apps/ads/data/ads.json`,
- a filled-in `context/ads.md`,
- `bash setup/scripts/install-claude-ads.sh` run in the copy (installs `.claude/skills/ads/` and the others), or just an empty folder `.claude/skills/ads-test`,
- a file in `.claude/agents/`,
- a folder `.claude-ads`,
- any file other than a README in `files/04-marketing/ads/` or its `exports` folder,
- any file (other than `.gitkeep`) in `apps/ads/data/media/`,
- an empty file `skills-to-upload/test.zip`,
- a ticked box in `setup/progress.md`,
- "Setup: complete" in `CLAUDE.md`,
- an ad account tool, such as `mcp__meta-ads__ads_get_campaigns`, added to the allow list in `.claude/settings.json`,
- the tag in `install-claude-ads.ps1` changed so it no longer matches the `.sh`.

## 3. The claude-ads install script

On a scratch copy of the kit (never the repo), run the `.sh` with a local clone used instead of GitHub:

```bash
CLAUDE_ADS_SOURCE=~/Repos/github/claude-ads bash setup/scripts/install-claude-ads.sh
```

Check: 34 skill folders (`ads` and `ads-*`) and 25 agents are in the scratch copy's `.claude/skills` and `.claude/agents`, `.claude/skills/ads/LICENSE`, `THIRD_PARTY_NOTICES.md` and `INSTALLED-BY-ADS-OS.md` are there, the manifest is `.claude/skills/.claude-ads-claude.manifest`, the temporary folder is gone, and nothing was written under the home folder's `.claude`. Then:

- Run it from GitHub with no `CLAUDE_ADS_SOURCE` (needs the network).
- Change `COMMIT` in a copy of the script and check it refuses and installs nothing.
- Hide `git` (a `PATH` with every other tool but not git) and check it takes the zip route: set `CLAUDE_ADS_ZIP_URL` to a `file://` address of `git archive --format=zip v2.0.1` of the clone, or leave it unset to download from GitHub. Check it refuses a zip made from another tag.
- Delete the scratch copy afterwards.

The `.ps1` can't be run on a Mac: to check on Windows with PowerShell 5.1, the same list.

## 4. Page checks

Run the app (`node apps/server/server.js` or `python3 apps/server/server.py`), open http://localhost:4747, go into Ads OS, and check:

- **One page**: the sidebar shows one item, "Ads". Under the top bar is the rail: Overview | Campaigns | New campaigns | This week (New campaigns shows its count), a Health check button with a coloured dot, and the Settings gear. Each view has its own address (`#overview`, `#campaigns`, `#builds`, `#week`, `#health`) and Back and Forward move between them; the keys 1 to 5 do too. Nothing scrolls sideways from 320 to 2560 pixels.
- **Fresh install** (empty data file): Overview and the first Home box show "Let's set up your ads" with the `/setup` line and a copy button. Every other empty page says what will fill it. With platforms on and no figures: "No figures yet. Press Refresh figures, or drop a report export into files/04-marketing/ads/exports and say: update my ads." Nothing mentions a demo.
- **Tiles**: Spend, Results (in the owner's word), Cost per result with its light, Return on ad spend (marked "estimated" when it's worked out from `worth` and `closeRate`), Pace this month. Each shows its change against the previous range of the same length, and every number matches `report.js week`.
- **By platform**: a card each, and the counting sentence under them: "Google and Meta count a result differently (Meta counts some results from people who only saw an ad, Google mostly counts clicks), so judge each against its own target rather than against each other."
- **Trend**: 12 weeks, light and dark, spend as bars, cost per result as a line, the target dashed, and a text table for screen readers.
- **Campaigns**: sortable table, a light on each row, the change against the previous range; clicking a row opens the campaign panel (see below). The platform switch is 3 coloured name tags, All | Meta | Google Ads, with no logos. On a phone it becomes cards.
- **New campaigns**: groups Waiting for you, Ready to build, Switch it on and Running. The drawer edits in place: name, platform, objective, dates, daily budget (with the monthly equivalent and the budget guard), the season (with the seasonal guard), who sees it, each ad with character counts against `AD.LIMITS`, the preview, Claude's why and the checks. Buttons by status: Ask Claude to change it, Approve, Drop (with Undo); Build it in my account, paused (Meta) with its line; Make the import file (Google) with its line; Switch it on (Meta, `in-account`: the confirm pop-up) with "I've switched it on myself" as a small link, and Open in Meta's Ads Manager; Open the build sheet, Open Google Ads and I've switched it on. A failing guard disables the build button and says why. A 503 from a job reads "Claude isn't switched on for the app. Open the folder in Claude and say: build my approved campaigns."
- **Photos and videos**: as in the shared version 7 checks, saving into `apps/ads/data/media/`, the drop zone, reorder, cover, large view, Remove with Undo, the wrong kind and an oversize file each refused in plain words.
- **This week**: the newest summary beside that week's figures; Write this week's summary; suggestions with Approve (and Undo on Not now); What should I change?.
- **Health check**: 5 or 6 checks, each Healthy, Watch or Needs action, matching what `model.js` works out; the 8-week results chart; the line "Nothing changes in your ad account until you press the button and say yes."
- **Settings** (the gear): every field in `settings`, a bad number refused with a plain message, saved across a reload.
- **Home boxes**: Ads this week, Waiting on you and Cost per result trend, all off to start.
- **Platform tags**: coloured badges in light and dark, no logos, nothing loaded from the internet (check the network panel).

## 5. Light and dark, phone widths, reduced motion

- **Light and dark**: every page, the drawer and the toast take the theme's colours in both. Text contrast at least 4.5 to 1, including the lights and every tag. The chart reads in both without relying on colour alone.
- **Phone width 320 and 375**: the sidebar opens from the menu button; nothing scrolls sideways on any page; the drawer is usable by touch.
- **Reduced motion**: with the OS setting on, nothing animates.

## 6. The 9 jobs, with a stand-in `claude`

Point `TLOS_CLAUDE` at a stand-in script that follows the job prompts without using real Claude (see Task List OS's own stand-in for the pattern). For each job, trigger it from the app and check:

- **`update-my-ads`**: the stand-in writes `campaigns` (each with its `ads`: words and status), `figures` (one row per campaign per day, the same campaign and date replaced rather than doubled, no totals anywhere), `adFigures` (one row per ad per day, also replaced, never added into `figures`) and `imports`, saves an ad's picture into `apps/ads/data/media/` only when the stand-in's connection hands one over (with an `m-` file name), and leaves the ad as words only otherwise, sets `platforms.<key>.lastRefresh`, and touches nothing else. Run it twice: no doubles.
- **`build-a-campaign`**: fills the new build (a build with a `request` of kind `write` and no ad words), status `draft`, 2 or 3 ads within `AD.LIMITS`, a budget inside the caps, a season, a why, checks and a `prediction` (`basis: "plan"`, with assumptions), then clears `request`. It writes nothing past `draft`. For a build with `fromCampaignId` and a `brief`, it follows the brief: same audience when asked, the dates and budget the owner gave (still inside the caps), kept, fresh or mixed ad words as asked.
- **`write-campaign`**: changes only the draft with the request, keeps the owner's edits, clears `request`.
- **`build-in-account`**: with a stand-in that records every call it makes: only create calls, each with status paused, then read calls; never an activate, update, pause, re-budget or delete call; `refs` filled, `status: "in-account"`, `builtAt` set. With the stand-in made to return one object as active on read-back: it stops, makes no further call, sets the build back to `approved`, and says so. A build with `refs.campaignId` already set is refused. A failing budget or seasonal guard is refused and changes nothing. On Google: the CSV has every status Paused and every headline within 30 characters and every description within 90, and the build sheet exists.
- **`send-to-task-list`**: only runs when `apps/installed.json` lists `task-list`, after Approve on a suggestion and after a successful `build-in-account`. It writes a suggested task for each approved suggestion and each `in-account` or `ready-to-import` build with no `taskId`, records the ids, and sends nothing twice. Without Task List OS the app never asks for it.
- **`analyse-campaign`**: for a campaign with `request.kind = "analyse"`, adds one `analyses` entry at the front (words only, every number in it in `report.js campaign <id>`), sets a `prediction` with assumptions only when the campaign has none (`basis: "analysis"`, `from` today) and never overwrites an existing one, adds up to 3 suggestions, clears `request`, and makes no ad account call that changes anything.
- **`make-account-change`**: with a stand-in that records every call it makes. For a `requested` Meta `switch-on`, `pause` and `budget` action each: runs `report.js action <id>` first; makes exactly 1 changing call; reads back; sets `doing`, then `done` with `readBack` (for a budget, equal to `budgetTo`) and `doneAt`; updates only that campaign or ad and `activity`. A `switch-on` of a build also sets the build `live` with `switchedOnAt`, copies its prediction to the campaign and sets `buildId`. With the check printing BLOCKED: no changing call, status `failed`, a plain `note`. With the read-back not matching: status `failed` and the note says what it found, with no second changing call. A `google` action, a delete, or a status that isn't `requested`: no call at all. Two requested actions: each handled once, in order.
- **`how-did-the-ads-do`**: this week's summary is added or replaced (one per `weekStart`), and every number in it appears in `report.js week`.
- **`what-should-i-change`**: up to 5 suggestions, none repeating an open one, every number in a `why` in the report, and no suggestion carried out.

Then, with real Claude and a test Meta ad account if you can: run `build-in-account` and confirm in Ads Manager that the campaign, ad set and ads exist and every one is paused. **To check: the Meta connection's tool names and whether its create tools accept a paused status.** And with a test Google Ads account: import the CSV into Google Ads Editor and confirm what arrives is paused. **To check: the columns in `google-ads-editor.md`.**

## 7. Claude changes an account only on the owner's click: a check by reading

Search the whole kit (`apps/ads/`, `.claude/skills/` apart from the installed claude-ads ones, `setup/`, `docs/`, `.claude/settings.json`) for anything that activates, enables, publishes, updates, pauses, re-budgets, uploads a customer list or deletes. Expected result: nothing that does, in code or in a skill, except `make-account-change`, which may switch on, pause or change a daily budget for one `requested` Meta action, and nothing in any skill or step touches Google beyond reading. In particular:

- `.claude/settings.json` allows no `mcp__` tool and no Meta or Google tool, and no command that sends, posts or deletes. The only commands allowed are the start scripts, the 2 install scripts and `node apps/ads/app/report.js`.
- Every skill that touches an account says so: `build-in-account` creates paused only, reads back and confirms, and never calls anything that activates, updates, pauses, re-budgets or deletes. `make-account-change` does only the one approved change, refuses on BLOCKED, reads back, never deletes and never touches Google. Every job prompt ends "Change only what the person approved in the app, and nothing else." The old wording ("never switch anything on", "never changes a live campaign", "nothing in your ad accounts changes") appears nowhere. Search for "never switch", "switch it on yourself", "Ads Manager", "nothing spends" and "never changes" and read every hit.
- The Open buttons in the app only open a new browser tab.
- Search the skills and the setup steps for the banned words (no em dash, no "delve", "game-changer", "unlock", "elevate", "seamless", "leverage", no list of 3 for effect, no hype).

## 8. Menu and locked-tool panel

As `SHARED-V3-CHANGES.md` section 5 describes: on a scratch copy, the sidebar shows Home, Ads OS as an open dropdown with its one page (Ads, carrying the count of things waiting on the owner), and the other 6 tools locked under "More tools" in catalogue order. Folding the dropdown shows the total waiting and the choice is remembered. Each locked tool opens the panel with the right tracking on its button link; Escape and a click outside close it; it works by keyboard and at phone width. `showMoreTools: false` in `catalogue.json` hides the locked tools completely. The `ads` entry reads as in `SHARED-CATALOGUE-RENAME.md`, `proposals` reads Proposal OS and `file-finder` is gone.

## 9. Setup, as the customer's Claude

On a fresh unzip, run `/setup` as if you were the customer's Claude, with a made-up business (Marlow Dental, new patient enquiries from Google and Meta). Check:

- It asks one question at a time and saves as it goes (look at `context/ads.md` and the data file between questions).
- Step 2 (claude-ads) runs the install script, says what it printed, and carries on if it fails, using `campaign-basics.md`.
- Step 3 asks which platforms, offers each connection as skippable, says "Claude needs at least one connected account to build campaigns for you. Without one, it can still read your figures from a report you download", tests each connection with one read (the name and the campaigns), and with neither walks through the exports.
- Step 4 asks about the customer and any ads run before, and saves `context/ads.md`.
- Step 5 suggests caps from the budget and a target with the sums shown, lets the owner decide, and saves `settings` (including `result.worth` and `closeRate` for a lead).
- Step 6 reads figures, writes a summary and suggestions, and offers a first campaign: "It stays a draft until you approve it."
- Step 7 passes every item in `setup/09-check-and-hand-over.md` and marks setup complete only at the very end.
- Nothing in the folder ends up containing a password, a token or a customer list.
- Quitting half way and typing `/setup` again carries on from `setup/progress.md`.

## 10. Attach to a scratch Task List OS (and Pipeline OS)

Follow `ATTACHING.md` on a scratch copy of Task List OS, then check:

- Both tools show as dropdowns in the sidebar; Home offers both tools' boxes (this tool's start off, in the hidden list, per the shared rule); nothing in Task List OS broke; setup didn't ask what the business does a second time.
- Approving a suggestion, then `what-should-i-change` (or the job), adds a suggested task to Task List OS (for a Google suggestion, "Pause the Summer whitening ad in Google Ads"; a Meta pause or budget suggestion becomes an account change only when the owner presses its button in the app), and `my-ads-check-in` adds "Switch on: <build>" for each build waiting to be switched on, each with `source.tool` set to `ads`, a `source.id` that matches the suggestion or the build, `suggested: true` and `addedBy: "claude"`. They show on its Review page with a New tag and need a click. Running either twice adds nothing twice. A task for a suggestion that isn't approved, or a build that is live, is never added.
- With Pipeline OS also attached: a deal moved to `won` whose source names an ad becomes one entry in `wins` once `update-my-ads` runs, never twice, and no deal record is changed. A Meta lead (from a test lead form, **to check** whether the connection returns lead details) becomes one suggested deal in Pipeline OS's Review, never twice, and no lead detail appears anywhere in `ads.json`.
- With Money View OS attached: it reads `figures` and `settings.monthlyBudget` itself, and Ads OS writes nothing into it.
- With none of those attached: everything above is skipped quietly, with no error.

## 11. Helper: Node and Python behave the same

Run the app once with `node apps/server/server.js` and once with `python3 apps/server/server.py` and repeat the page checks in section 4 for each: saving the data file, the job endpoints for all 9 jobs, and the backup file (`ads.backup.json`) all behave the same in both.

## 12. The helper's photo and video routes

`node maintainers/test-helper-media.js` starts a scratch copy of the Node helper, and of the Python helper if `python3` is there, on a free port and checks over http (the full list is in `SHARED-V7-CHANGES.md`). It uses a temporary folder and never writes into the kit. If it can't open a port it prints `COULD NOT RUN` and exits with 2: run it somewhere that can. It is not part of `make-release.sh`, which has to work on a machine that blocks local ports.

## Round 2 checks (22 October 2026)

Run with the demo data (the rebuilt Marlow Dental demo), then with a fresh blank copy.

- **Campaign panel**: click any campaign row or card. Top: name, platform tag, status, light, the prediction score ("Score 112: ahead of what Claude predicted", with the sums on hover or click, and "Claude predicted £24 per enquiry and 4 a week; it's doing £21 and 5 a week") and the 12-week chart. The demo shows one campaign ahead, one on track and one behind, and a campaign under 7 days old reads "Too early to score".
- **Ads carousel**: 2 to 5 ads. Previous and next buttons, left and right arrow keys, swipe on a phone, dots, "2 of 5", each slide showing the ad as it reads on the platform (business name, picture if any, headline, words, button) with its own spend, results, cost per result for the chosen range, and its status. With no ads: "Claude reads your ads' words the next time it refreshes your figures." A campaign's totals never change because of the ad rows.
- **Analyse campaign**: sets `request`, runs the job, and the panel shows the newest analysis (summary, working, wasting, couldn't see). Without Claude switched on, the 503 line reads plainly.
- **Run campaign**: the 5 questions on one screen (who sees it, budget with the budget guard live, dates, the ads, anything else). "Draft it" creates a build with `fromCampaignId`, `brief` and `request.kind = "write"`, runs `write-campaign`, and the draft shows in New campaigns.
- **Confirm pop-up**: Switch on, Pause campaign and Change daily budget (Meta only) each say the exact change in one sentence, show the limits check, and have Yes, do it and Cancel. A budget that takes you over a limit blocks Yes, do it and says why. Cancel creates nothing. After Yes, the button shows "Claude is doing it", then the read-back line. The same button for a Google campaign shows "Open Google Ads" and "Add to my task list" and never creates an action.
- **New campaigns**: an `in-account` Meta build has Switch it on (the pop-up). A `ready-to-import` Google build keeps "I've switched it on".
- **To do tab**: number key 5 (Health check is 6). 2 columns, one on a phone. "Claude can do this" has a Do it button per item that runs the job or opens the confirm pop-up. "You need to" has Open, Add photo, Open Google Ads or Tell Claude, and a "what to give Claude" line. The count in the rail matches the count on Overview's Waiting on you strip (which links here) and `node apps/ads/app/report.js todo`.
- **Safety words on screen**: "Nothing changes in your ad account until you press the button and say yes." appears where the old "never switches anything on" line was. No platform logo anywhere.
- **Real Claude, test Meta account** (to check, not run yet): `make-account-change` for each of switch on, pause and a budget change, and confirm in Meta's own Ads Manager that exactly that one thing changed. **To check: which tool does each, and its arguments.**

## What can't be tested without real Claude and a real ad account

- A real `/setup` run: everything above uses a stand-in `claude`, so the actual wording Claude uses when talking to a person, and how it handles an ambiguous answer, needs a run with real Claude.
- A real Meta connection: its tool names, whether it creates paused, what it returns on read-back, whether it can upload pictures, which tool switches on, pauses and changes a daily budget, and whether it returns each ad's words, status, picture and daily figures.
- A real Google Ads connection and a real Editor import: the connection's read tools, and what the CSV's columns do.
- The export clicks and column names for Meta Ads Manager and Google Ads, as they look today.
- Whether Meta's connection has reached a given account yet (it is in staged beta).
- Real figures: whether the lights feel right on a real account, and whether Meta's and Google's results line up with what the owner counts as a result.
- Time saved: not measured. Don't quote a figure.
