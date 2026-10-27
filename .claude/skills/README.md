# Skills

Saved know-how for running your ads. You don't need to remember any of this: ask in your own words and Claude picks the right one.

Each skill is a folder with a `SKILL.md` inside. Claude reads them from here whenever this folder is open.

## Your ads

In Claude Code, every skill is also a command: type `/` and its name, for example `/update-my-ads`.

| Skill | Say something like | What happens |
|---|---|---|
| `update-my-ads` | "Update my ads", "refresh my ad figures", "here's my ads report", or press **Refresh figures** in the app | Claude reads your connected ad accounts, or the report you downloaded, and saves your campaigns, their ads and your daily figures. It only reads. The app does all the sums |
| `build-a-campaign` | "Make me a campaign", "build an ad for", "new campaign for", or press **New campaign** in the app | Claude drafts a whole campaign: who sees it, 2 or 3 ads, a daily budget inside your limits, the dates and a prediction of what it should do. It stays a draft until you approve it, and nothing is touched in your ad accounts |
| `build-in-account` | "Build my approved campaigns", "put it in my account", or press **Build it in my account, paused** in the app | On Meta, Claude creates your approved campaign in your ad account switched off, then reads it back to check. On Google, it writes a file for Google Ads Editor and a step-by-step sheet. Nothing spends until you switch it on in the app and say yes |
| `analyse-campaign` | "Analyse my campaign", "how's the whitening campaign doing?", or press **Analyse campaign** on a campaign in the app | Claude looks closely at one campaign and writes what is working, what is wasting money and what it couldn't see. It adds a prediction if there isn't one, and up to 3 suggestions. It changes nothing in your ad account |
| `make-account-change` | You press **Switch on**, **Pause campaign** or **Change daily budget** in the app and confirm the pop-up | On Meta, the app opens Claude on screen with the change typed in. Claude checks your yes and your limits first, makes that one change in your ad account (Claude Code asks you before each step), reads it back and tells you what it found. It never acts on its own and never touches Google Ads |
| `how-did-the-ads-do` | "How did the ads do?", "ads this week", or press **Write this week's summary** in the app | Claude writes a few plain sentences on what happened, what worked, what didn't and what to watch, using the numbers the app worked out |
| `what-should-i-change` | "What should I change?", "what's wasting money?", "any suggestions?" | Claude adds up to 5 suggestions, each with a plain reason. You decide. A Meta pause or budget change happens only when you press its button in the app and confirm |
| `my-ads-check-in` | "What's waiting on me in ads?", "anything to switch on?" | Claude tells you what you need to do and what it can do for you, from the To do tab |

Some skills use the claude-ads skills (the ones starting `ads`) when they are installed. Setup installs them. If they aren't there, Claude works from `build-a-campaign/references/campaign-basics.md`.

## Keeping things organised

| Skill | Say something like | What happens |
|---|---|---|
| `sort-brain-dump` | Press **Brain dump** on any page (or V) and talk | Claude sorts it and sends each part to the right tool |
| `file-it` | "Save this file" | Claude suggests a folder and a name, and files it once you agree |
| `connect-a-tool` | "Connect my team's shared folder" | Claude walks you through connecting an app safely |
| `match-my-brand` | "Make it match my brand" | Your colours, font and logo on the app, from your website or brand guidelines |
| `setup` | `/setup` | Runs the setup, or carries on where it left off |
| `open-the-app` | "Open my ads" | Starts the app if needed and gives you the link, http://localhost:4747 |
| `get-updates` | "Get the latest version", "any updates?" | Your copy brought up to date with a safe backup first. Your records, notes, skills and brand stay exactly as they are |
| `keep-context-fresh` | (automatic) | When you mention something new about the business, Claude offers to update its notes |

## Writing

| Skill | Say something like | What happens |
|---|---|---|
| `human-email` | "Make this sound less robotic" | Any draft is checked so it reads like a person wrote it |
| `write-like-me` | "Learn how I write" | Claude learns your style (with permission) and writes in it |
| `polite-chaser` | "Chase this up for me" | A chaser at the right level of firmness, with the specifics |

## The rules every skill follows

- Nothing spends until you say yes. Claude builds campaigns switched off.
- On Meta, Claude switches a campaign on, pauses a campaign or an ad, or changes a daily budget only when you pressed the button in the app and confirmed that exact change. It does that one change, reads it back and tells you. It never acts on its own and never goes over your limits.
- Claude never deletes anything in your ad accounts, and never changes anything on Google Ads: that connection only reads, so Google changes stay with you.
- No ad account tool is pre-approved. Claude Code also asks you before every call to Meta or Google.
- Claude never makes up a result, a price or a customer's words. If it needs one, it asks you.
- Claude never stores a password, a token or a customer list.
- Everything stays in this folder or in the apps you've connected.

## Adding your own

Ask Claude: "Make a skill for how we do X." It'll write one in this folder using the same format, and show it to you first. Don't start its name with `ads`: that's the start of the claude-ads skills.
