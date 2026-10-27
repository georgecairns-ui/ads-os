# Shared version 9: what changed since version 8

Shared version 9, 27 October 2026. Everything in `SHARED-V3-CHANGES.md` to `SHARED-V8-CHANGES.md` still applies; this file lists only what's new. Version 8 was made in Task List OS and is waiting for its release; version 9 goes into all 7 tools at once and does not depend on it.

**Why:** the helper said "Task List OS is running at http://localhost:4747" whatever tool it belonged to, so Ads OS told its owner Task List OS was running. Its other messages, its log file and the app's "helper isn't running" wording said Task List too.

**The fix:** the helper reads the folder's own name from `toolkit.json` (`"name"`, for example `"Ads OS"`), or from the first tool in `apps/installed.json` if `toolkit.json` has none. The helper files stay byte for byte the same in every tool. A tool attached to another folder takes that folder's name, because the folder's `toolkit.json` is the host's.

## What changed

| Path | Change | Copy to other tools |
|---|---|---|
| `apps/server/server.js`, `apps/server/server.py` | Reads the name once at start-up. "<Name> is running at http://localhost:4747", "<Name>: port 4747 is already in use..." and "<Name>: could not start..." use it. The Claude run log is `~/Library/Logs/<name>-claude.log` (for example `ads-os-claude.log`, `small-business-toolkit-claude.log`), no longer `task-list-os-claude.log` for every tool. `GET /api/info` also returns `"name"`. Top comment no longer says Task List OS. Nothing else changed | Byte for byte |
| `apps/shared/js/store.js` | The helper errors say "The helper on this computer isn't running." / "didn't answer." in place of "The task list helper...". In helper mode `folderName` is the name from `/api/info`, not "Task List OS" | Byte for byte |
| `apps/shared/VERSION` | `9` | Yes |

## Small Business Toolkit

The kit's overlay replaced "Task List OS is running at" with "Small Business Toolkit is running at" in both helpers. The helper now reads "Small Business Toolkit" from the kit's own `toolkit.json`, so those 2 overlay files (`maintainers/overlay/apps/server/server.js.replace-json` and `server.py.replace-json`) are removed: they would no longer find the old line and the build would stop.
