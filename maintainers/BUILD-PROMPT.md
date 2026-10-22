The 22 October 2026 round 2 decision (the owner presses the button, Claude acts, on Meta) replaces "Claude never switches anything on" below. See `maintainers/SPEC.md`.

# Build prompt: Ads OS

This tool was first briefed as "Ads Dashboard OS" on 7 October 2026 (the original brief is kept below). George's new brief of 21 October 2026 overrides it where they differ, and `maintainers/SPEC.md` holds the agreed plan.

## George's new brief, 21 October 2026

- Name **Ads OS** (catalogue id `ads`), public repository `ads-os`.
- Setup installs the claude-ads skill pack (MIT, upstream github.com/AgriciDaniel/claude-ads, George's fork georgecairns-ui/claude-ads). Agreed: installed from the fork at setup time, pinned to a tag, keeping the MIT notice.
- START-HERE and setup ask: connect your Meta ad account, connect your Google Ads account (both skippable, but the tool needs one to create campaigns; a report export is the fallback for reading), their ideal customer, whether they have run ads before and what happened, budget, what counts as a result, target cost per result.
- It creates campaigns for them. Claude builds full campaigns (audience, copy, budget) PAUSED; the owner reviews them in the app and switches them on in Ads Manager. Nothing spends without them. Claude never switches anything on and never changes a live campaign. Agreed for Google, whose own connection only reads: a Google Ads Editor import file plus a build sheet.
- Still: one plain-English screen of spend, results, cost per result and return on ad spend, by platform and campaign, trend against target, weekly summary, suggestions. The app does all the maths. Google and Meta count results differently: say so in one sentence.
- The Vault City Brewing reference is the "Claude Ads: what you can do now" guide, reused for its ideas only.

---

## The original brief, 7 October 2026


You're helping me (George, Get AI Powers) build **Ads Dashboard OS**, one tool in our small business toolkit. I'm not a developer, so explain anything technical in plain English and give me exact click-by-click steps whenever I need to do something myself.

## The toolkit

The toolkit is a set of tools for UK small business owners: Task List OS (already built) plus 8 more. Each one is a complete kit someone can use on its own, and each one can be attached to any of the others, so whatever combination a customer has works as one app with one Claude. Attach all of them and they have the whole toolkit. That's the point Joey and I agreed: separate tools that are useful alone, that we can give away individually, and that click together into something bigger. The people using it run "boring" businesses: trades, agencies, recruiters, brewers, accountants. Smart, busy, non-technical. They'll never look at code.

## Read these first

1. **`ATTACHING.md`**, in the Google Drive toolkit folder: `~/Library/CloudStorage/GoogleDrive-george.cairns@getaipowers.com/Shared drives/Get AI Powers Brain/Claude/05_Marketing/small-business-toolkit/ads-dashboard-os/ATTACHING.md`. The rules every tool follows so they attach to each other and show each other in the menu. Treat it as the spec. Copy it into the repository unchanged.
2. **Task List OS, at `~/Repos/getaipowers/task-list-os`.** It's the reference build, and Ads Dashboard OS must look, feel, set up and behave like it. Read README.md, START-HERE.md, CLAUDE.md, LICENSE, `maintainers/MAINTAINING.md`, `maintainers/TESTING.md`, `docs/CUSTOMISING.md`, `apps/server/`, `apps/shared/`, `apps/home/`, everything in `apps/task-list/` (especially its CLAUDE.md, `menu.json` and `home-boxes.js`), `context/`, `setup/`, `.claude/skills/README.md` and a few skills, including `match-my-brand`. Your tool copies its layout, look, helper, setup style, skills style and wording rules. Its own notes already say future tools go in `apps/<tool-name>/`.
3. **Task List OS's `apps/shared/VERSION`.** It must say 3 or later: the redesign with the Home dashboard, the sidebar dropdowns, light and dark, and `match-my-brand`. If it says less, stop and tell me the Task List OS redesign isn't published yet. Read `maintainers/SHARED-V3-CHANGES.md`: it is the exact list of what every tool copies and what each tool makes for itself (`installed.json`, `toolkit.json`, `menu.json`, `home-boxes.js`, `index.html`, the store). If another tool in `~/Repos/getaipowers/` has a newer shared version, use that one.

If anything in this brief contradicts how Task List OS actually works, Task List OS wins: tell me what you found and follow it. Load my `get-ai-powers-brand` and `brand-web-kit` skills before designing any screen, but follow Task List OS's look (its `theme.css`, light and dark) so the tools match when they're attached.

## This tool: Ads Dashboard OS

**Who it's for.** Businesses that win most of their work through Google and Meta ads. Not every business needs it, so it's an add-on rather than a core tool.

**The pain.** Spend sits in 2 ad managers that are hard to read. The owner can't tell what each lead costs or which campaign is wasting money.

**What it does.** One plain-English screen: spend, results (leads, sales or calls, whatever they count), cost per result and return on ad spend, by platform and campaign, this week against last, and a 12-week trend. Claude refreshes the numbers from a connected ads account if they have one, otherwise from a report export (setup walks through the exact clicks in Meta Ads Manager and Google Ads). Claude writes a short "what happened this week" summary and proposes changes (pause this, move budget there, test this headline). Claude never changes anything in the ad accounts.

**Data** (`apps/ads/data/ads.json`): settings (platforms, currency, what counts as a result, target cost per result, monthly budget), campaigns, daily or weekly figures, weekly summaries, suggestions, imports log.

**Screens:** overview tiles against target; by platform; campaign table with a traffic light; trend charts (hand-built SVG); weekly summary and suggestions tray.

**Skills:** update my ads dashboard, how did the ads do this week, what should I change.

**Attached:** approved changes become tasks for the person to make. New leads arrive in the pipeline as suggested deals, and the pipeline tells it which leads became customers. Ad spend shows in the money view.

**Watch out for:**
- All the maths is done by the app from the raw figures.
- Google and Meta count results differently. Say so on screen in one plain sentence.
- I built something similar for Vault City Brewing. Ask me for it before designing so we reuse what worked.
- Load my `ads-strategy`, `meta-ads-manager`, `google-ads-campaign` and `dataviz` skills.

## Set up the repository (do all of this for me)

1. Create the repository at `~/Repos/getaipowers/ads-dashboard-os`, next to `task-list-os`, and set it up the way Task List OS is set up (same branch habits, same `.gitignore`, same release script adapted for this tool).
2. Lay it out exactly like Task List OS, as set out in `ATTACHING.md` and `SHARED-V3-CHANGES.md`: kit files at the root, `toolkit.json`, `apps/server/`, `apps/shared/` (including `catalogue.json`), `apps/home/`, `apps/installed.json` listing only this tool, `apps/ads/` (with `menu.json` for its sidebar pages and `home-boxes.js` for its Home boxes, all `defaultOn: false`), `context/`, `files/`, `setup/`, `.claude/skills/`, `docs/`, `maintainers/`, and the launcher `Open Ads Dashboard.html`. Copy the shared parts across from Task List OS byte for byte, don't rewrite them.
3. Copy Task List OS's LICENSE and change only the product name. Copy this build prompt into `maintainers/BUILD-PROMPT.md` and `ATTACHING.md` to the root.
4. Write `toolkit.json`, `apps/ads/ATTACH-CLAUDE.md` and `maintainers/MAINTAINING.md` for this tool.
5. Commit at each milestone (set up, plan agreed, app working, setup and skills written, tested on its own, tested attached) with a plain-English message.
6. Publish: create a public GitHub repository called `ads-dashboard-os` on the same account as Task List OS (`georgecairns-ui`) and push. Before the very first push, tell me in one line what's about to go public and wait for my yes. That's the only time you need to stop and ask.
7. Google Drive copy: refresh the Drive folder `~/Library/CloudStorage/GoogleDrive-george.cairns@getaipowers.com/Shared drives/Get AI Powers Brain/Claude/05_Marketing/small-business-toolkit/ads-dashboard-os/` as a plain copy of the published version (no git history), the same way Task List OS's Drive copy works. Anything in that folder that isn't part of the published version goes into an `_archive` folder inside it, never deleted. Add the same "don't edit here" note Task List OS's copy has.
8. If `gh` (the GitHub command line tool) isn't installed or logged in, install it or walk me through the login in numbered steps, then carry on.

## Make it customisable for clients

- **Look**: `apps/shared/theme.css` and `apps/shared/images/` only, set by the `match-my-brand` step during setup. Every screen in light and dark, in Task List OS's look.
- **The menu**: your tool uses the shared sidebar and `catalogue.json` as they are. Every other toolkit tool shows locked with the Book a free call panel. Don't build your own menu or your own booking link.
- **Words and settings**: labels, stages, categories and anything business-specific in one obvious place, documented in `docs/CUSTOMISING.md` the way Task List OS does it.
- **Demo data**: the same made-up people and businesses as Task List OS (Sam, Priya, Tom at Greenway Café, Marlow Dental and the rest: check its `demo-data.js`), so a demo of several attached tools feels like one believable business.

## Rules (same as Task List OS)

- No frameworks, no libraries, nothing loaded from the internet. The app runs through the shared helper at http://localhost:4747 and works offline.
- Every change to a data file goes through `store.update()`.
- You propose, they approve. Read and draft only in connected apps. Never anything that sends, pays, deletes or posts on the customer's behalf, and never pre-approve tools that could in `.claude/settings.json`.
- Any number the person relies on (totals, VAT, forecasts, cost per lead) is calculated by the app from the raw data, never typed in by Claude.
- Customer-facing words never say agent, repo, repository, artifact, JSON, schema, API or MCP. British English, digits for numbers, no em dashes anywhere, including code comments.
- Never commit filled-in `context/`, real data, a ticked `setup/progress.md` or "Setup: complete". Copy Task List OS's release checks.
- No prices for Get AI Powers services anywhere. Point to getaipowers.com only.
- Never delete files. Move them to `files/99-archive/` (or `_archive/` for build files) and tell me.

## How to work with me

1. Read everything above, then come back with a short plan before writing any code: the screens in words, the data file, the skills and what people say to trigger them, the setup steps, exactly what this tool reads from and sends to the others (from the table in `ATTACHING.md`), any changes the shared parts need, and anything in this brief you think is wrong. Push back if something won't work. Wait for my OK.
2. Don't change the shared parts or Task List OS's skills. If you think they need changing, tell me what and why; that change gets made in Task List OS first and copied to every tool.
3. Build it, then test by hand following Task List OS's `maintainers/TESTING.md` and section 5 of `SHARED-V3-CHANGES.md`, on a scratch copy, never the shipped data.
4. **Test it on its own**: fresh copy, run `/setup` as if you were the customer's Claude with a made-up business, use every page and skill.
5. **Test the menu**: on its own, every other tool shows locked, and clicking one opens the panel with the right booking link and tracking.
6. **Test it attached**: on a scratch copy of Task List OS, follow `ATTACHING.md` to attach this tool. Check both appear as dropdowns in the sidebar, Home offers both tools' boxes, nothing in Task List OS broke, setup didn't ask questions `context/` already answered, and every handoff in the table lands where it should and waits for a click.
7. Write MARKETING.md in `maintainers/`: one plain sentence on what it does, the before and after for the owner, and the 3 things to show in a 60-second video. Mark any time-saving claim "to check".
8. Publish (step 6 of the repository section) and refresh the Drive copy.
9. Finish by telling me in plain English: where it is, the GitHub link, how to open it, how to try the demo, how attaching went, what isn't finished, and what you'd improve next.
