# Step 7 of 7: check and hand over

Goal: prove it all works, then leave them with a clear picture of what's in the app and what they need to do.

## 1. What good looks like

Check these yourself. Fix anything that fails, then check again.

- [ ] The app opens at **http://localhost:4747/ads/**.
- [ ] Overview shows their real figures (or says "No figures yet" with the line about Refresh figures, if nothing was connected or downloaded), with their own result word ("Cost per enquiry"), not placeholder text.
- [ ] Campaigns lists their real campaigns, each with a light, and opening one shows how it's doing against Claude's prediction, its 12 weeks, its ads and its buttons.
- [ ] If a draft campaign was made, it shows in New campaigns, and its words, budget and dates match what you said. The budget guard and the seasonal guard both show.
- [ ] This week shows the summary and the suggestions. To do lists what they need to do and what Claude can do.
- [ ] **Refresh figures**, **New campaign** and the other Claude buttons can ask Claude to run a job. It needs Claude Code installed on this computer; if it isn't, the app says to ask Claude instead, rather than failing quietly.
- [ ] The app looks right in both light and dark (the moon or sun button at the top).
- [ ] `.claude/settings.json` still allows no ad account tool: no Meta or Google tool is pre-approved.
- [ ] Nothing was switched on, edited, paused, re-budgeted or deleted in any ad account unless the owner pressed the button in the app and confirmed that exact change. If a campaign was built on Meta, you read it back and every part of it is paused. Nothing was changed on Google.
- [ ] Nothing secret (a password, a token, a customer list) is anywhere in this folder, and none was typed into the chat.

## 2. Hand over

Give them a plain summary with real numbers from their own account, never an example. For instance:

> Here's where you are. Your Meta account is connected, and Google comes from the report you downloaded. Your cost per enquiry is £22 against your £25 target, so you're on track, and you've used £310 of your £600 this month. I've drafted a campaign called "New patient check-up, autumn": it's waiting for your Approve in New campaigns, and nothing in your account has changed.

(Use only numbers the app shows.)

Then tell them, briefly:

- **What's waiting on them**, in your own words: what to approve, what to add (pictures, a landing page check), what to switch on, and what Claude can do for them on the To do tab.
- **How a campaign goes live:** Approve it, ask Claude to build it (switched off in your Meta account, or as a file for Google Ads Editor), check it, then on Meta press Switch it on in the app and confirm the pop-up, and Claude does that one change and reads it back. On Google you switch it on yourself in Google Ads, then press "I've switched it on". Nothing spends until you say yes. Claude never acts on its own, never deletes anything, and never changes anything on Google.
- **Their limits:** the daily and weekly limits they set, and that Claude won't build a campaign that goes over them.
- **What to say next:** "update my ads" (or press Refresh figures), "how did the ads do?", "what should I change?", "make me a campaign", "what's waiting on me in ads?".
- That Google and Meta count a result differently, so each is judged against its own target.
- That they can say "get the latest version" any time and you will bring the app up to date, keeping everything of theirs.
- Their link, **http://localhost:4747/ads/**. Bookmark it.

## 3. A weekly look (optional)

If they said yes in step 6, check it's set up. If they didn't, don't ask again.

## 4. Mark setup complete

Only now, at the very end:

1. In `CLAUDE.md`, change `Setup: not done yet` to `Setup: complete on <date>`.

Never commit any of these changes yourself; that's for the people who maintain this kit.

Tick this step in `setup/progress.md` and change "Setup status" to `complete on <date>`.
