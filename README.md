# Ads OS

**Your Google and Meta ads on one plain-English screen.** A free kit from [Get AI Powers](https://getaipowers.com), run by Claude.

Most business owners with ads can't tell what a new enquiry costs, or which campaign is wasting money. The figures sit in 2 ad managers that are hard to read, and nobody checks them often enough. Ads OS puts your spend, your results, your cost per result and your return on one screen, for each platform and each campaign, this week against last, with a light that says whether each one is on target. Claude writes a short summary each week and suggests what to change. It also builds new campaigns for you, switched off, and on Meta it makes the changes you approve, so you can run your ads from here.

**Nothing spends until you say yes.** Claude drafts a campaign, you approve it, and Claude builds it switched off: on Meta, in your ad account with every part paused, read back to check; on Google, as a file you import into Google Ads Editor, which arrives paused.

On Meta, Claude switches a campaign on, pauses a campaign or an ad, or changes a daily budget only when you press the button in the app and confirm that exact change in the pop-up. The pop-up says the change in one sentence and shows whether it fits your limits. Claude does that one change, reads it back and tells you what it found. Claude never acts on its own, never goes over your limits and never deletes anything.

Google's own connection only reads, so Claude never changes anything on Google Ads. Google changes stay with you, with a link to Google Ads and a step-by-step task. Claude Code also asks you before it touches your Meta or Google account at all, so you approve a Meta change twice: in the app, then in Claude Code.

Ads OS is part of a toolkit of 8 free tools from Get AI Powers. The others (a task list, Pipeline OS, proposals and more) show in the app's menu, and Get AI Powers sets them up with you on a free call.

## What happens when you type /setup

You copy the kit, open it in Claude Code and type **/setup**. In about 30 minutes, Claude:

- **Gets to know your business**, in a short chat, then matches the app to your brand (your colours, your font, your logo if you have one).
- **Adds the claude-ads skills**, a free set of ad-planning skills (see "Built on claude-ads" below), from a copy that has been tested.
- **Asks where your ads are.** Meta (Facebook and Instagram), Google Ads, both, or neither yet. It offers to connect each one: Claude needs at least one connected account to build campaigns for you. Without one, it can still read your figures from a report you download, and it walks you through the exact clicks.
- **Asks about your customer.** Who they are, where they are, what makes them pick you, and what happened with any ads you've run before, including what you'd never do again.
- **Asks about your budget and your results.** What you'll spend a month, daily and weekly limits it suggests and you decide, what counts as a result (a form filled in, a call, a booking, a sale), what a new customer is worth, and the cost you're aiming for.
- **Takes a first look.** It reads your figures, writes a first summary and suggests a few changes, then offers to draft your first campaign.
- **Checks it all works and hands over**, with a summary of where you are and what's waiting on you.

## What it does

- **One screen of plain numbers.** Spend, results (in your own word, such as enquiries), cost per result against your target, return on ad spend and how this month's spend is pacing against your budget. Each shows the change on the last period. The app works out every number from the raw figures. Claude never types one.
- **A light for every campaign.** Green at or under your target, amber up to a quarter over, red beyond that, and grey "Too early to say" when there isn't enough to judge. Google and Meta count a result differently (Meta counts some results from people who only saw an ad, Google mostly counts clicks), so judge each against its own target rather than against each other.
- **This week against last, and 12 weeks of trend.** Spend as bars, cost per result as a line, your target as a dashed line.
- **Limits that mean something.** Daily and weekly limits and a monthly budget. A day or week over a limit is flagged, and Claude won't draft or build a campaign that would take you over.
- **Campaigns drafted for you.** Who sees it, 2 or 3 ads in your voice, a daily budget inside your limits and dates. A season check means a Christmas ad can never run in June. You read it in the app, change it, or ask Claude to change it, then press Approve.
- **Built switched off.** On Meta, Claude creates the approved campaign in your account paused and reads it back. On Google, Claude writes a file for Google Ads Editor and a step-by-step sheet. You check it, then on Meta press Switch it on and confirm. On Google you switch it on yourself and press "I've switched it on".
- **Every campaign, ad by ad.** Click a campaign to see each of its ads as it reads on the platform, with that ad's own spend and results, and a score against what Claude predicted it would do.
- **Analyse and run again.** Press Analyse campaign and Claude says what is working, what is wasting money and what it couldn't see. Press Run campaign to draft the next one from it: same people or new, same budget or new, same ads or fresh ones.
- **A To do list.** What you need to do, and what Claude can do for you with one press of Do it.
- **A weekly summary.** 4 to 6 plain sentences: what happened, what worked, what didn't and what to watch.
- **Suggestions you decide on.** Pause this, move budget there, test this headline. You approve the ones you want. On Meta, a pause or a budget change happens when you press its button and confirm. On Google, you make it yourself.
- **A health check.** One button shows whether your figures are up to date, whether you're on target, whether you're on pace, whether you've passed a limit, whether results are being counted and whether anything has waited on you too long.
- **Your pictures and videos.** Add them to an ad by dragging them in. They stay on your computer.

It's **yours to shape**: your platforms, your limits, your target, your own colours, in light or dark.

## What you need

- **Claude Code**, signed in with a paid Claude plan (Pro or Max). The Claude desktop app works too.
- A Meta ad account and a Google Ads account if you want Claude to read them. Both are optional: a downloaded report works.
- Nothing else to install in most cases. The app runs on your own computer using Node (Claude installs it for you if it's missing, with your permission).
- About 30 minutes, once.

## Get started

1. **Open Claude Code** in the Claude desktop app (the Code tab) or in the Terminal (on Windows, PowerShell). Any folder will do for this first step.
2. **Ask Claude to fetch the kit.** Paste this:
   > Copy https://github.com/georgecairns-ui/ads-os into a folder called "Ads OS" in my Documents, then tell me how to open it and set it up.

   Claude copies everything onto your computer and gives you one line to open the new folder. In the desktop app, you choose the folder instead. (If your computer asks to install "command line developer tools" or Git, say yes; it's free and takes a few minutes.)
3. **Open the Ads OS folder in Claude Code and choose "Yes, I trust this folder".** The first time, Claude Code asks whether you trust the folder and warns that it pre-approves some permissions. Those permissions only let Claude update your ads app and your business notes, add the ad-planning skills, look things up on public web pages and start the app, without stopping to ask each time. They don't let Claude touch your ad accounts: Claude Code asks you before every single thing it does in your Meta or Google account. Press the down arrow, then Enter.
4. **Type `/setup`.**

Then it opens your ads and gives you its link, **http://localhost:4747/ads/**. Bookmark it.

## Every day

| Say (or type the command) | What happens |
|---|---|
| "Update my ads", "here's my ads report" | Your figures are brought up to date, from your connected accounts or the report you downloaded |
| "How did the ads do?" | A plain summary of the week, using the app's numbers |
| "What should I change?" | Up to 5 suggestions with a reason each. You decide |
| "Analyse my whitening campaign" | What is working, what is wasting money and what Claude couldn't see, for that campaign |
| "Make me a campaign for my autumn offer" | A draft campaign that waits for your Approve. Nothing is in your account yet |
| "Build my approved campaigns" | Each approved campaign is built switched off: in your Meta account, or as a file for Google Ads Editor |
| "What's waiting on me in ads?" | What you need to do, and what Claude can do for you |
| "Open my ads" | Starts the app if it isn't already running |

## Your information

Your ads app lives in this folder on your computer, in one file. Your notes about the business are in `context/`. Claude reads your ad accounts only through a connection you set up yourself, and only to read, plus creating paused campaigns on Meta if you ask, and making a Meta change you approved in the app. It never stores a password, a token or a customer list. There's no Ads OS account or server; Get AI Powers can't see any of it. Read [docs/PRIVACY-AND-SAFETY.md](docs/PRIVACY-AND-SAFETY.md) for the detail.

## Make it yours

Change the platforms, the limits, the words on screen, the colours and the thresholds behind the lights, by asking Claude. See [docs/CUSTOMISING.md](docs/CUSTOMISING.md).

## Built on claude-ads

Setup adds the [claude-ads](https://github.com/AgriciDaniel/claude-ads) skills to your folder. claude-ads is a free set of paid-advertising skills by AgriciDaniel, under the MIT licence, and Ads OS uses it to plan and draft campaigns. Ads OS installs a tested copy from George's fork at [github.com/georgecairns-ui/claude-ads](https://github.com/georgecairns-ui/claude-ads), fixed at version v2.0.1, and keeps the licence beside it in `.claude/skills/ads/`. Claude uses it to think and draft. It never uses it to change an ad account. If you'd rather not install it, Ads OS still works from its own basics.

## Want it set up properly for you?

Ads OS works on its own. If you'd like help turning it into a weekly habit for your whole team, Get AI Powers can help. Find us at [getaipowers.com](https://getaipowers.com).

## What's inside

```
START-HERE.md          Claude reads this first and runs setup (/setup)
toolkit.json           what this tool is, for attaching it to the others in the toolkit
ATTACHING.md           how the toolkit's tools attach to each other
CLAUDE.md              Claude's standing instructions in this folder
Open Ads OS.html       double-click to open your ads (or use the link Claude gives you)
setup/                 the 7 setup steps, the connection guides and the install scripts
context/               Claude's notes about your business
.claude/skills/        saved know-how; each one also works as a command in Claude Code
skills-to-upload/      a skill you ask Claude for, packed up for the Claude app
files/                 your business documents, in numbered folders (your ad files are in files/04-marketing/ads)
apps/                  the app and its look (theme.css); apps/ads/data/ads.json is your ads data
docs/                  customising, privacy and safety
maintainers/           for people developing Ads OS itself
```

## Licence

Free to use and change for your own business. Not for resale. See [LICENSE](LICENSE) for the plain-English terms. claude-ads is MIT-licensed and installed separately: see its own licence in `.claude/skills/ads/` after setup.

Fonts: Figtree (the app's font), plus Zilla Slab and Source Serif 4 for anyone who wants them, all under the SIL Open Font License (see `apps/shared/fonts/OFL.txt`).
