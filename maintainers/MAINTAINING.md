# Maintaining Ads OS

For people developing the kit itself. Customers never need this folder, but it is public on GitHub, so keep it free of anything private.

## What this project is

Ads OS is a tool in the small business toolkit, built the same way as Task List OS (the reference build), Pipeline OS and the rest. It started as `git archive main` of the `content-machine-os` repository at shared version 7, and keeps that kit's layout, setup style and wording rules. A small business owner asks Claude to clone it, opens it in Claude Code and types `/setup`. It puts their Google and Meta ads on one plain-English screen (spend, results, cost per result and return, by platform and campaign), drafts new campaigns, builds the approved ones switched off, shows each campaign's ads and a score against a prediction, analyses a campaign, writes a weekly summary and suggests changes. Since round 2 (22 October 2026) owners run their ads from it instead of Ads Manager.

- **Nothing spends without the owner.** Claude builds campaigns paused: on Meta, in the ad account through Meta's own connection, with every object paused and read back; on Google, whose own connection only reads, as a Google Ads Editor import file and a build sheet. On Meta the owner switches it on from the app, and on Google in Google Ads.
- **Owner's click, Claude acts (George's decision 1 of 22 October).** On Meta, Claude may switch on a paused campaign, pause a campaign or an ad, or change a daily budget, only when the owner pressed the button in the app and confirmed that exact change in a pop-up. The app creates an entry in `actions`, runs `make-account-change`, which checks the limits (`report.js action <id>`), does that one change, reads it back and records it. Claude never acts on its own, never goes over the owner's limits, never deletes, and never changes anything on Google (Google's connection only reads, so Google changes stay click-by-click tasks with an "Open Google Ads" link). This replaced "Claude never switches anything on and never changes a live campaign" of 21 October.
- **No ad account tool is pre-approved** in `.claude/settings.json`, so Claude Code asks before every Meta or Google call. The owner approves a Meta change twice: in the app, then in Claude Code.
- **No logos** for Google or Meta anywhere (checked 22 October: Google allows its logo only for formal partners, and no Meta rule allows a third-party tool to show its logo for an integration). The platform switch is 3 coloured name tags, **All | Meta | Google Ads**, and nothing implies partnership or endorsement.
- **The app does all the maths.** Claude writes raw daily figures only, never a total.

`maintainers/SPEC.md` is the build spec (data shape, pages, numbers, skills, setup, attaching). `maintainers/BUILD-PROMPT.md` has George's brief of 21 October 2026 and the earlier 7 October prompt. Where the spec and a reference kit differ, the reference kit's pattern was copied and the spec notes it.

The tool's id is `ads`, its folder is `apps/ads/`, its code namespace is `window.AD`, its sidebar icon is `barChart` and its repository is `ads-os`.

## Stack

- Same as the other toolkit OSs: no framework, no build step, nothing from the internet. Shared parts (`apps/server/`, `apps/shared/`, `apps/home/`, `ATTACHING.md`, `setup/scripts/` apart from the install scripts, `setup/connections/` apart from the 2 ad guides, and the shared skills listed in `SHARED-V3-CHANGES.md`) are copied byte for byte from Task List OS. **Never change them here: change them in Task List OS first, raise the shared version, then copy the change to every tool.** `SHARED-V3-CHANGES.md` through `SHARED-V7-CHANGES.md` are the exact record of what's shared and what each tool keeps for itself; read them in order. This kit's deliberate differences from the shared copies are in `SHARED-CATALOGUE-RENAME.md` (the catalogue and the `ATTACHING.md` row) and 2 small additions: `setup/connections/README.md` has 2 more rows for Meta Ads and Google Ads, and `.claude/skills/setup/SKILL.md` has its own description.
- `apps/ads/` is this tool's own folder: `index.html`, `menu.json`, `home-boxes.js` (3 boxes, all off to start), `claude-jobs.json` (the 9 jobs below), `CLAUDE.md` (Claude's reference for the data), `ATTACH-CLAUDE.md` (what's copied into another folder's `CLAUDE.md` when attached) and `data/ads.json`.
- `apps/ads/app/`: `model.js` (pure functions, no DOM, also runs under Node), `report.js` (prints the app's own numbers for Claude), `components.js`, `charts.js`, `drawer.js`, `media.js`, `settings.js`, the `view-*.js` views and `app.js`, with `app.css` and `views.css`. Every number the app shows is worked out in `model.js` from the raw data, never typed.
- There is no demo mode (shared version 6): a fresh install shows a "Let's set up your ads" card with the phrase to say to Claude.
- Platform tags are coloured badges drawn with CSS from theme variables, never platform logos.

## The data file

One file, `apps/ads/data/ads.json`. Its shape is in `SPEC.md` and in `apps/ads/CLAUDE.md`. It ships empty, exactly as `SPEC.md` shows it, and the release check refuses anything else.

| Section | Who writes it |
|---|---|
| `settings` | The app (Settings) and setup. Claude fills the business name, the result, the targets and the limits during setup only |
| `platforms` | Setup and Claude (`how`, the account name). `lastRefresh` is set by `update-my-ads` |
| `campaigns` | Claude (`update-my-ads`, and `build-in-account` for one it just built). Each carries its `ads` (read by `update-my-ads`), its `prediction` (copied from its build when it goes live, or written by `analyse-campaign` when it has none) and a `request` the app sets and Claude clears |
| `figures`, `adFigures` | Claude (`update-my-ads`), raw numbers only. Campaign totals always come from `figures`, never from adding up `adFigures` |
| `builds` | Claude drafts and builds them, and writes each `prediction`. The app sets `approved`, `dropped`, the owner's edits, `request`, `fromCampaignId` and `brief`. `live` and `switchedOnAt` are set by the app for "I've switched it on", or by `make-account-change` after a confirmed switch-on |
| `analyses` | Claude (`analyse-campaign`), words only, newest first |
| `actions` | The app creates one (`requested`) after the owner confirms the pop-up. Claude (`make-account-change`) sets `doing`, then `done` with `readBack`, or `failed` with a `note` |
| `summaries` | Claude (`how-did-the-ads-do`) |
| `suggestions` | Claude adds them. The app sets the owner's decision |
| `wins` | Claude, copied read only from Pipeline OS |
| `imports`, `activity` | Claude, newest first, activity capped at 200 |

**Rule for Claude: never write a total.** `AD.model` adds up spend and results, works out cost per result, return, the light and the pace.

## The 9 Claude jobs

Defined in `apps/ads/claude-jobs.json` (the shared job mechanism from `SHARED-V4-CHANGES.md`: the app asks `POST /api/claude/run/ads/<job>` with only the job's name; the words Claude follows live in this file, never in the request). Each is also a skill in `.claude/skills/<name>/SKILL.md` so it works the same whether the app triggers it or the person just asks Claude. Every prompt ends with the line "Change only what the person approved in the app, and nothing else." The release check requires it.

- **`update-my-ads`** (Refresh figures): reads each connected account with read tools, or the newest export in `files/04-marketing/ads/exports/`, and writes `campaigns` (with their ads), `figures`, `adFigures` and `imports`, and saves ad pictures only if the connection hands them over (to check). The exact clicks to export a report, and which column becomes which figure, are in its `references/exports.md`.
- **`build-a-campaign`** (New campaign, Run campaign): fills a new build, draft only, with a `prediction` from `ads-math`. Follows `brief` and `fromCampaignId`.
- **`write-campaign`** (Ask Claude to change it): changes a draft that has a `request`.
- **`build-in-account`** (Build it in my account, paused, or Make the import file): Meta, creates paused objects, reads back, sets `in-account`. Google, writes the import file and build sheet, sets `ready-to-import`. Refuses when the budget or seasonal guard fails.
- **`analyse-campaign`** (Analyse campaign): runs `node apps/ads/app/report.js campaign <id>`, writes an `analyses` entry, sets a prediction if none, adds up to 3 suggestions, clears `request`. Never changes the account.
- **`make-account-change`** (after the confirm pop-up): for each `requested` action, runs `report.js action <id>` and refuses on BLOCKED, does that one change on Meta, reads it back, writes `readBack`, and sets the status. A `switch-on` of a build also sets it `live`, copies its prediction to the campaign and links `buildId`. One change per action, never deletes, never touches Google.
- **`how-did-the-ads-do`**: runs `node apps/ads/app/report.js week` and writes the summary.
- **`what-should-i-change`**: adds up to 5 suggestions.
- **`send-to-task-list`**: follows the Task List section of `apps/ads/ATTACH-CLAUDE.md`. The app runs it after Approve on a suggestion and after a successful `build-in-account`, and only when `apps/installed.json` lists `task-list`. It writes a suggested task for each approved suggestion and each `in-account` or `ready-to-import` build with no `taskId`, and records the ids.

`my-ads-check-in` is for asking in chat. The connection rules live once in `.claude/skills/build-in-account/references/connections.md`, and the Google Ads Editor file's columns in `references/google-ads-editor.md`. **Every tool name and column in those 2 files, and every click in `exports.md` and `setup/connections/meta-ads.md` and `google-ads.md`, is marked "to check": none was seen first hand when they were written.** Check each against the real screens and tools, and correct the files, before a release goes to real customers.

## claude-ads

Setup (`setup/ads-01-install-claude-ads.md`) runs `setup/scripts/install-claude-ads.sh` (Windows: `.ps1`). It installs the claude-ads skills and agents into this folder's own `.claude/skills` and `.claude/agents`, skills only (`--no-deps`), never into the owner's home folder.

- **Source:** George's fork, https://github.com/georgecairns-ui/claude-ads. Upstream is https://github.com/AgriciDaniel/claude-ads (MIT, by AgriciDaniel).
- **Pin:** tag `v2.0.1`, commit `669c7608ecb50dd95c941a71fa3ca0a1c0e40512`. The script fetches into a temporary folder outside the workspace (with git, or the tag's zip when git isn't there), refuses to install unless the commit is exactly the pin, runs the installer, copies `LICENSE` and `THIRD_PARTY_NOTICES.md` into `.claude/skills/ads/`, writes `.claude/skills/ads/INSTALLED-BY-ADS-OS.md` and removes its temporary folder. The installer itself doesn't copy the licence.
- **What gets installed:** 34 skill folders (`ads` and `ads-*`) and 25 agents, plus `.claude/skills/.claude-ads-claude.manifest`. All of it is in `.gitignore` and the release check refuses it.
- **Where claude-ads keeps its own state:** under this folder's `.claude-ads/` (its runs are in `.claude-ads/runs/<run-id>/`; its setup and brand profiles are written beneath the same state folder, and the exact file name isn't fixed by the pack, to check). It is in `.gitignore`.
- **Our skills never start with `ads`**, because that is claude-ads' prefix and the manifest owns those folders.
- If the install fails, Ads OS still works from `.claude/skills/build-a-campaign/references/campaign-basics.md`.

### Moving the pin

1. Pull the new version into the fork (`georgecairns-ui/claude-ads`) from upstream, read what changed, and tag it in the fork.
2. Read the new `install.sh`, `install.ps1`, `ads-setup`, `ads-launch`, `ads-optimize`, `ads-audit` and anything that touches an account or credentials. Note anything that now writes outside `.claude-ads/`, asks for a token or changes how it installs.
3. Change `TAG` and `COMMIT` at the top of `setup/scripts/install-claude-ads.sh` and `install-claude-ads.ps1`, in step with each other, and the version in this section and in `setup/ads-01-install-claude-ads.md` if it names the counts.
4. Test the `.sh` on a scratch copy of the kit: `CLAUDE_ADS_SOURCE=~/Repos/github/claude-ads bash setup/scripts/install-claude-ads.sh` (a local clone at the new tag, used instead of GitHub), then the real thing from GitHub. Check the skill and agent counts, `.claude/skills/ads/LICENSE` and that a wrong commit refuses. Delete the scratch copy.
5. Re-check that `build-a-campaign`, `what-should-i-change` and the skills' wording still say draft only for claude-ads.
6. Update the licence note if upstream's licence or notices changed.

## Attaching

`toolkit.json` and `apps/ads/ATTACH-CLAUDE.md`. Reads: Pipeline OS won deals whose source is an ad (into `wins`, read only) and `context/`. Sends, each waiting for the person's click: to Task List OS, a suggested task for each approved suggestion and for each build waiting to be switched on; to Pipeline OS, new Meta leads as suggested deals when the connection returns lead details. Money View OS reads Ads OS's figures itself. Ads OS never edits another tool's records.

## How the release works

`bash maintainers/make-release.sh` from the repo root runs `node maintainers/test-model.js`, builds `dist/ads-os.zip`, a clean copy for a customer to download. It checks every file that ships is still a blank template: the data file must equal the empty file in `SPEC.md`; `context/ads.md` and every other context file blank; no installed claude-ads files (`.claude/skills/ads/`, `.claude/skills/ads-*/`, `.claude/agents/`, the manifest) and no `.claude-ads/` folder; nothing in `apps/ads/data/media/` except `.gitkeep`; nothing in `files/04-marketing/ads/` except READMEs; no zip in `skills-to-upload`; no demo code; nothing that sends or posts pre-approved, and no ad account tool pre-approved at all. It then copies the kit into a folder called "Ads OS" leaving out this `maintainers/` folder and clutter, runs the checks again on the copy plus structural ones (every file that must exist, every JSON file that must parse, every skill in `toolkit.json` present with a matching name, the 7 jobs pointing at real skills or, for send-to-task-list, at ATTACH-CLAUDE.md, the app's scripts syntax-check cleanly, no em dash, no banned word, no old tool name in the files this tool owns, and the pin in both install scripts agreeing), then zips it. `dist/` is git-ignored. Publishing follows the other tools: a `claude/...` branch from `origin/main`, the release script run and passing, a pull request into `main`, never a direct push or a force push.

## Rules

- Anything committed ships, so never commit a filled-in `context/`, a non-empty data file, a ticked `setup/progress.md`, "Setup: complete" in `CLAUDE.md`, an installed claude-ads folder or a zip in `skills-to-upload`.
- No prices for Get AI Powers services anywhere (point to getaipowers.com), no em dashes, British English, digits for numbers, no "delve", "game-changer", "unlock", "elevate" or hype. Customer-facing words never say agent, repo, repository, artifact, JSON, schema, API or MCP. No client names.
- Claude changes an ad account only for the one change the owner approved in the app (Meta only), never acts on its own, never goes over their limits, never deletes, never changes anything on Google, never creates anything not paused, and never has an ad account tool pre-approved.
- Claude never invents proof: no results, numbers, prices, offers, reviews or customer names. Missing facts become a question for the owner.
- Every number on screen is worked out in `model.js` from the data. Claude writes only raw platform figures.
- Never store a token, a password or a customer list in the kit.
- Never delete files. Move them to `files/99-archive/` (or `_archive/` for build files) and say so.

## Open questions for George

- Meta's connection (`https://mcp.facebook.com/ads`) and Google's own connection haven't been used by anyone building this kit. Their tool names, whether Meta's create tools accept a paused status, whether Meta's connection can upload pictures, which tool does a switch-on, a pause and a daily budget change (third-party write-ups name `ads_activate_entity` and `ads_update_entity`) and what arguments each takes, whether it returns each ad's words, status and picture, how the daily figures are asked for per ad, are all "to check" in `connections.md`. Before a release to customers, someone with a Meta and a Google Ads account should run through `build-in-account` on a test account.
- The Google Ads Editor import file's columns, values and the import clicks are "to check" in `google-ads-editor.md`. Import the file into an empty test account in Editor first.
- The export clicks and column names for Meta Ads Manager and Google Ads are "to check" in `exports.md`.
- claude-ads' setup profile (written by its `ads-setup` skill) needs more than a small business owner will answer (data-lifecycle and mutation settings). Setup step 3 tells Claude to fill those from what is known and not ask the owner. Check what `ads-setup` really writes and where.
- The ad word limits in `AD.LIMITS` are to check against each platform's current help page before each release. On Google an ad's `primaryText` and `description` are both Google descriptions, per `LIMITS`.
- Time saved is not measured. Don't quote a figure (see `MARKETING.md`).
