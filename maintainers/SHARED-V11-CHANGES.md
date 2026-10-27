# Shared version 11: what changed since version 10

Shared version 11, 27 October 2026. Everything in `SHARED-V3-CHANGES.md` to `SHARED-V10-CHANGES.md` still applies; this file lists only what's new.

**Made in Task List OS first,** from today's code review. Copy it to every other tool in its next release.

**Why:** any web page could stop the helper (`GET /%` threw an uncaught error); an app save could overwrite an edit Claude had just written; the start-up skill, scripts and their messages said "task list" in every tool; and the update and brand skills had gaps.

## What every tool copies, byte for byte

| Path | Change |
|---|---|
| `apps/server/server.js`, `apps/server/server.py` | **Crash fixed.** A bad percent sign or a NUL in a page address (`GET /%`, `/%zz`, `/%00`) answers 400 instead of stopping the helper. Node also wraps every request in a catch that answers 500, refuses a save whose bytes are not valid text (it used to repair them silently), and Python answers 400 for a Content-Length that is not a number or is negative. **Lost updates.** Every read of a data file sends `ETag` (a 24-character fingerprint of its contents); a save may send it back as `If-Match`. If the file is no longer exactly that, the answer is 409 and nothing is written; an `If-Match` that is not a fingerprint gets 400; no `If-Match` saves as before (older apps keep working). The check and the save happen together, so 2 saves based on the same copy cannot both pass. A successful save answers `{ modified, version }` and the new `ETag`. Python's `server_version` no longer names a tool, and the top comments say "the app" |
| `apps/shared/js/store.js` | Helper mode sends `If-Match` with each save. On 409 it re-reads, makes the same change on the new copy and saves again, up to 2 more times, then fails with a plain "file kept changing" error without overwriting. A helper that sends no `ETag` (an older one) is saved to once, with no header |
| `.claude/skills/open-the-app/SKILL.md` | **Renamed from `open-task-list`.** Neutral wording; triggers include "open the app", "open my app", "start the app" and each tool's own phrase ("open my task list", "open my pipeline", "open my skill map", "open my proposals", "open my content machine", "open my money view", "open my ads"). Uses `start-app.*` |
| `setup/scripts/start-app.sh`, `start-app.ps1` | **Renamed from `start-task-list.*`.** Messages and the log file (`~/Library/Logs/<name>.log`) use the folder's name |
| `setup/scripts/autostart-mac.sh`, `autostart-windows.ps1` | Messages, the launch agent (`com.getaipowers.<name>`) and the Windows task (`<name>`) use the folder's name. They also retire an agent or task made earlier under another name for the same folder (the old one moves to `.removed`; nothing is deleted), so 2 helpers never fight for the port. For Task List OS the label and task name do not change |
| `setup/scripts/save-key.sh`, `save-key.ps1` | Messages say "this folder" or the folder's name. The same profile line is never added twice, whatever its old comment said |
| All 3 scripts' name | Read like the helper does: `name` in `toolkit.json`, else the first tool's in `apps/installed.json`, else "Your toolkit" |
| `.claude/skills/get-updates/SKILL.md` | One temporary folder made once (`T="$(mktemp -d)" \|\| exit 1`) and reused for every tool; `curl -fsL` everywhere. SHA-256 of every data file before anything changes, again after the helper is stopped, and a third time after applying; any difference is a failure. Stops the helper first (and switches autostart off and back on), and says the hourly check-in must not run meanwhile. New rows: a file they deleted that the kit changed (stays deleted, mentioned); a same-named skill of theirs that was not in the old kit (theirs; the kit's one beside it as `<name>-kit` only with their yes); a binary file where all 3 differ (theirs, listed). Says plainly that with no saved download the first update keeps every changed file and does little. Warns that edits outside the pre-approved paths ask for permission. Step 6.4 restarts with `open-the-app` |
| `.claude/skills/match-my-brand/SKILL.md` | Downloads into `"$TMPDIR/brand"` (`mkdir -p`, `cd`, absolute `-o` paths) so nothing lands in the customer's folder; a Windows variant (`curl.exe`, `$env:TEMP`); `curl -fsL`; no tool named |
| `setup/connections/README.md` and the 9 guides that said "your Task List OS folder" (`calendly`, `fathom`, `fireflies`, `granola`, `hubspot`, `otter`, `pipedrive`, `stripe`, `tldv`) | "What it gives your app"; "in this folder" |
| `maintainers/test-helper-safety.js` | New. Runs against both helpers: badly formed addresses, bodies and headers never stop the helper or give a 5xx; the version check (409, 400, old-app saves, 2 at once); `store.js` re-read and retry, run in a sandbox against the real helper; and `store.js` against a helper with no versions |
| `.gitignore` | Add `*.saving` |
| `apps/shared/VERSION` | `11` |

`ATTACHING.md` is unchanged (still version 4).

## Each tool adapts

- **Rename every reference** to `open-task-list` and `start-task-list`: the skill folder (`git mv .claude/skills/open-task-list .claude/skills/open-the-app`), the 2 scripts, `.claude/settings.json` (the 2 `Bash(...)` allow lines become `start-app.sh` and `start-app.ps1`), the row in `.claude/skills/README.md` and `CLAUDE.md`, the tool's own `apps/<tool>/CLAUDE.md`, `setup/*.md`, `docs/`, `START-HERE.md`, `README.md` and `maintainers/`. A tool with its own start script (Money View's `start-money-view.sh`) switches to the shared one.
- **`toolkit.json`:** `sharedVersion` `"11"`.
- **`START-HERE.md`:** `curl -fsL` in both copy commands.
- **`README.md`, "Get started":** the prompt must make Claude use START-HERE's copy line, for example: `Copy <Tool name> from https://github.com/georgecairns-ui/<repository> into a folder called "<Tool name>" in my Documents, using the copy line in its START-HERE.md (not git), then tell me how to open it and set it up.` Keep the line for Claude with START-HERE's raw address, and drop the "install Git" aside.
- **`maintainers/make-release.sh`:** fail if `toolkit.json` `sharedVersion` differs from `apps/shared/VERSION`; fail if any file uses `open-task-list` or `start-task-list`, or if `setup/scripts/`, `apps/server/` or `apps/shared/js/` says the tool's own name (the check here looks for "Task List OS"; each tool looks for its own name, and `window.TaskListOS` is allowed). The "must exist" list names `setup/scripts/start-app.sh`.
- **`maintainers/MAINTAINING.md`:** shared version 11; the new test.
- **Small Business Toolkit:** its build copies the 7 tools together, so also check its overlay and its own `.claude/settings.json` and `START-HERE.md` for the old names.

## Task List OS only (not shared)

- `apps/task-list/app/view-review.js` uses `M.reviewCount(d)`; `view-tasks.js` takes each column's count from the new `M.stageCount` in `model.js`.
- `maintainers/MAINTAINING.md`, `README.md`, `START-HERE.md`, `CLAUDE.md` and the skills README renamed as above.

## Left as they are on purpose (existing installs rely on them)

- The environment names `TLOS_PORT`, `TLOS_AUTO_CLAUDE` and `TLOS_CLAUDE`, `window.tlosAlive` (the launcher page checks it), the `window.TaskListOS` namespace, the IndexedDB name `task-list-os` and the folder-picker id `task-list-os-<tool>`.
- Where saved keys live: the Mac Keychain service `task-list-os` and `~/.config/task-list-os/` on Linux. Keys saved earlier are found there; changing them would lose them.
- `.claude/skills/sort-brain-dump/SKILL.md` still names Task List OS and Pipeline OS, because it routes notes to the tool they belong to. The wording in the table at the top of `setup/connections/README.md` (Inbox, Review, Calls) is still Task List's.

## Older copies

A folder installed before this version has the old skill and scripts. `get-updates` brings in the new ones and, because the kit dropped the old files, moves them to the backup folder; the old `.claude/settings.json` lines are replaced the same way. Nothing else of theirs changes.
