# Shared version 4: what changed since version 3

Shared version 4, 8 October 2026. Everything in `SHARED-V3-CHANGES.md` still applies; this file lists only what's new. Copy the changed files into every tool.

**New in version 4:** the helper can run a small Claude job for any tool, not only Task List OS's voice notes. Pipeline OS needed it so that call notes added to a deal fill the deal in straight away, without anyone typing to Claude.

## What changed

| Path | Change |
|---|---|
| `apps/server/server.js`, `apps/server/server.py` | New `POST /api/claude/run/<tool>/<job>`. The old `POST /api/claude/sort-brain-dump` works exactly as before. Runs are queued one at a time, and asking again for a job that's already waiting doesn't queue it twice. `/api/claude/status` also returns `job` (the job running now, as `<tool>:<job>`) and `lastJob` |
| `apps/shared/VERSION` | `4` |

Copy both helper files byte for byte, as before.

## How a tool adds a job

Put `apps/<tool>/claude-jobs.json` in the tool's own folder:

```json
{
  "jobs": {
    "update-deals": {
      "label": "updating deals from new call notes",
      "prompt": "Call notes have just been added to a deal in Pipeline OS. Follow .claude/skills/update-a-deal for deals with notes waiting. Change nothing else."
    }
  }
}
```

- The app asks with `fetch("/api/claude/run/<tool>/<job>", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })`. A `202` means it started or is queued; `404` means no such job; `503` means Claude Code isn't installed or the person turned it off (`TLOS_AUTO_CLAUDE=off`).
- The app sends only the job's name. The words Claude follows come from the file, never from the request, so nothing on a page can make Claude do something else.
- Only tools listed in `apps/installed.json` can have jobs, and only from their own folder. The helper never saves `claude-jobs.json`, so the app can't change it.
- The prompt is cut to 4,000 characters and every run gets "nobody is watching, don't ask questions" added. Keep prompts short and point at a skill: the skill holds the detail.
- Watch `/api/claude/status` until `running` and `queued` are both false and `lastJob` is yours, then read `lastResult` (`ok` or `failed`).
- A job must be safe to run with nobody watching: it reads and updates the tool's own data file. It never sends, books or deletes anything, the same rule as everywhere else.

## Testing

On a scratch copy with `TLOS_CLAUDE` pointing at a fake `claude` script, in Node and Python:

- A listed job returns `202` and runs the fake with the file's prompt plus the "nobody is watching" line.
- An unknown job, a tool not in `apps/installed.json`, a missing or broken `claude-jobs.json`, and a request from another website or without the JSON content type are all refused.
- Asking for the same job 3 times while it runs queues it once.
- `/api/claude/sort-brain-dump` still works as in version 3.
