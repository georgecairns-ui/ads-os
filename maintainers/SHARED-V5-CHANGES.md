# Shared version 5: what changed since version 4

Shared version 5, 9 October 2026. Everything in `SHARED-V3-CHANGES.md` and `SHARED-V4-CHANGES.md` still applies; this file lists only what's new. Copy the changed files into every tool.

**New in version 5:** Brain dump is a shared part. One button, on Home and in every tool's top bar, with the same recorder, the same "What's it about?" row and one place the notes go. Claude sorts each note and passes each part to the right tool.

## What changed

| Path | Change |
|---|---|
| `apps/shared/js/braindump.js` | New. The Brain dump: the recorder (or a typing box in browsers without speech), "What's it about?" (Let Claude decide, every tool in `apps/installed.json`, and anything the page's tool adds with `register()`), saving to `apps/home/data/braindump.json`, starting Claude, and saying what Claude did. Any element with `data-brain-dump` opens it, and so does V |
| `apps/shared/base.css` | The Brain dump styles moved here from Task List OS's `app.css` (`.topbar__voice`, `.claude-status`, `.modal--voice`, `.voice*`, `.about*`) |
| `apps/server/server.js`, `server.py` | Saves `/api/data/home/braindump.json` (in `apps/home/data/`, never shipped). `POST /api/claude/sort-brain-dump` now starts the shared skill, and its job is called `shared:brain-dump` |
| `apps/home/index.html` | A Brain dump button and the "Claude is sorting" pill in the top bar; loads `braindump.js` |
| `.claude/skills/sort-brain-dump/` | New shared skill: sorts every note and hands each part to the right tool's own brain dump skill |
| `.claude/settings.json` | Allows Claude to edit `apps/home/data/**`, so an unattended sort can mark notes as sorted |
| `apps/shared/VERSION` | `5` |
| `apps/shared/theme.css` | Colours moved onto the Get AI Powers brand (9 October 2026): cream `#F5F3EE` page, `#FFFDFB` cards, ink `#191919` text, clay `#D97757` accent with clay deep `#9C5238` for small text, warm ink dark mode. Category meaning colours unchanged |
| `apps/shared/images/` | The 2 old starburst logo files (`GAIP-*.svg`) removed; the app shows the Claude icon (`claude-icon.png`) |

## What each tool does

- In the top bar: `<button type="button" class="btn topbar__voice" data-brain-dump title="Brain dump: talk, and Claude sorts it out (V)"><span data-icon="mic"></span><span class="topbar__voice-label">Brain dump</span></button>`, and a `<span class="claude-status" id="claudeStatus" hidden></span>`.
- Load `../shared/js/braindump.js` straight after `sidebar.js`. Remove the tool's own recorder and its V shortcut.
- To add its own choices to "What's it about?", the tool calls `window.TaskListOS.brainDump.register("<tool id>", { pickers: function () { return [{ type: "deal", label: "A deal…", items: [{ id, label }] }]; }, preset: function () { return null; } })` once its data has loaded.
- Give Claude a brain dump skill for its own part (Task List OS: `sort-my-brain-dump`; Pipeline OS: `sort-pipeline-brain-dump`) and name it in `ATTACH-CLAUDE.md`, so `sort-brain-dump` knows where to hand things.
- Add `Edit(./apps/home/data/**)` and `Write(./apps/home/data/**)` to `.claude/settings.json`.

## Testing

- The button and V open the same recorder on Home and every tool page; V does nothing while typing or with a pop-up open.
- "What's it about?" lists every installed tool, plus the page's own pickers.
- Done saves to `apps/home/data/braindump.json` (Node and Python), starts `shared:brain-dump`, and the summary Claude writes appears when it's done.
- Demo mode says nothing was saved; Firefox gets a typing box.
