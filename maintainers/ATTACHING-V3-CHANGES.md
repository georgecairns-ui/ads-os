# ATTACHING.md version 3: what changed since version 2

ATTACHING.md version 3, 23 October 2026. Nothing else in the file changed apart from the Money View OS row below, and the shared version (`apps/shared/VERSION`) stays at 7: no helper or shared file is touched.

**Made in Ads OS first.** George said yes on 23 October 2026, and `ATTACHING.md` and this note went to all 7 tools by pull request the same day, byte for byte.

**Why:** attaching never said to bring the incoming tool's permissions across. Found while testing Ads OS attached to Task List OS: the folder's `.claude/settings.json` was Task List OS's, so Claude asked every time it saved an Ads OS record (`Edit` and `Write` on `./apps/ads/data/**`) and every time it ran `node apps/ads/app/report.js`, which Ads OS uses for every number it quotes.

## What changed

| Where | Change |
|---|---|
| Header | "Version 3, 23 October 2026" |
| "Attaching: what Claude does" | New step 7: add the incoming tool's own `permissions.allow` entries to the folder's `.claude/settings.json`. The old steps 7 to 9 are now 8 to 10. Step 5, the only step referred to elsewhere, keeps its number |
| Step 10 (was 9) | `setup/progress.md` records each permission added, letter for letter |
| Detaching | The permissions the tool added come out again, unless another attached tool still has the same entry |
| `toolkit.json` | `attachingVersion` is `"3"` in every tool (it was `"1"`, though the file already said version 2) |
| Toolkit table | The Money View OS row reads "Your money month by month from your accounts app, with a 12-week forecast and the tax to put aside", matching the menu since the 23 October menu pull requests |

Step 7 sits before the tool's setup steps on purpose: Ads OS's setup runs `setup/scripts/install-claude-ads.sh`, so its permission has to be there first.

## The rule, and why each part is there

An entry is added only when all 3 are true:

1. **Not already there, letter for letter.** Keeps the file free of repeats.
2. **It belongs to the incoming tool.** `Edit`/`Write` inside `./apps/<tool>/` or on the skill folders the tool makes for itself (Content Machine OS writes what it learns into `./.claude/skills/*-what-works/**`), a `Bash` running a script in `apps/<tool>/` or a setup script the tool brings, or `WebSearch`/`WebFetch`. The entries every tool shares are already in the folder from the first kit, so they're left as they are. This also stops a tool granting itself write access to another tool's data, which "Reading is fine, writing is not" forbids.
3. **Nothing that sends, posts, publishes, uploads or deletes**, and nothing open-ended. Those stay as a question every time, so the person sees it before it happens.

Claude never removes or rewrites what's there, never touches `deny`, `ask` or any other setting, and never touches `settings.local.json`. Claude Code reads the file when it starts, so a new entry works from the next start; step 9 already restarts the helper, not Claude.

## What each tool adds today, attached to Task List OS

Checked against each tool's `.claude/settings.json` on `main`, 23 October 2026.

| Tool | Added | Left out |
|---|---|---|
| Ads OS | `Edit` and `Write(./apps/ads/data/**)`, `WebFetch`, `Bash(bash setup/scripts/install-claude-ads.sh)`, the `.ps1` twin, `Bash(node apps/ads/app/report.js:*)` | |
| Content Machine OS | `Edit` and `Write(./apps/content/data/**)`, `Edit` and `Write(./.claude/skills/*-what-works/**)`, `WebFetch` | |
| Pipeline OS | `Edit` and `Write(./apps/pipeline/data/**)` | |
| Proposal Writing OS | `Edit` and `Write(./apps/proposals/data/**)` and `(./apps/proposals/brand/**)`, `WebFetch` | |
| Skill and Folder Map OS | `Edit` and `Write(./apps/skill-map/data/**)`, the 17 `scan`, `scan-files` and `tidy` script entries | `Bash(ls:*)`: open-ended. Claude asks first |
| Money View OS | `Edit` and `Write(./apps/money/data/**)`, `Bash(bash setup/scripts/start-money-view.sh)` and the `.ps1` twin | |

Ads OS's 2 Bash scripts were read before writing this: `report.js` only reads `apps/ads/data/ads.json` and prints, and the install script fetches a pinned copy of claude-ads into a temporary folder and removes only that folder.

## Settled by George, 23 October 2026

- **Content Machine OS's `what-works` skills:** allowed. A skill folder a tool makes for itself counts as the tool's own.
- **`attachingVersion`:** bumped to `"3"` in all 7.

## Still open

- **Money View OS's start script** is its own (`start-money-view.sh`), not the shared `start-task-list.sh`, so it gets added. Worth checking whether Money View should use the shared one like every other tool.

## Testing

By hand, in a scratch copy of Task List OS:

- Attach Ads OS. `.claude/settings.json` has Task List OS's 15 entries unchanged and in the same order, with the 6 Ads OS entries in the table above added after them, and the file is still valid JSON.
- Start Claude again in the folder and ask for this week's ad numbers: `node apps/ads/app/report.js week` runs without a question, and saving an Ads OS record doesn't ask.
- Attach Ads OS a second time: nothing is added twice.
- Put a `deny` entry and a `settings.local.json` in the folder first: both are exactly the same afterwards.
- Detach Ads OS: its 6 entries come out, Task List OS's 15 stay.
