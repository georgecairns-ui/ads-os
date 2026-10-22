# Shared version 2: what every tool copies from Task List OS

> **Superseded on 6 October 2026 by `SHARED-V3-CHANGES.md` (shared version 3).** Build every tool against version 3. This file is kept for the record.

Shared version 2, 6 October 2026. Task List OS is the reference. Every other tool in the toolkit (Pipeline OS, Skill and Folder Map OS and the rest) copies the parts below from this folder so they can attach to each other. `ATTACHING.md` explains why; this file is the exact list.

When a shared part changes here, the number in `apps/shared/VERSION` goes up, this file gets a new version, and the change is copied into every other tool.

## 1. Copy these unchanged, byte for byte

| Path | What it is |
|---|---|
| `apps/server/server.js`, `apps/server/server.py` | The helper. Serves `apps/` at http://localhost:4747 and saves the data files of installed tools. Same behaviour in both |
| `apps/shared/theme.css` | Every colour, font and size. A customer's own colours live here; when attaching, keep theirs |
| `apps/shared/base.css` | Buttons, inputs, dialogs, toasts, cards, animation |
| `apps/shared/sidebar.css` | The sidebar: brand, page links (`.nav`, `.nav__item`), the toolkit menu (`.tools`), the locked panel, the footer, and the phone-width drawer |
| `apps/shared/js/ui.js` | Helpers and icons. Exposes `window.TaskListOS.ui` |
| `apps/shared/js/store.js` | Reading and saving the data file. Exposes `window.TaskListOS.createStore` |
| `apps/shared/js/toolkit-menu.js` | "Your tools" and "More tools". Exposes `window.TaskListOS.toolkitMenu` |
| `apps/shared/catalogue.json` | All 9 tools, what each does, and the booking link |
| `apps/shared/VERSION` | `2` then the date, one per line |
| `apps/shared/fonts/`, `apps/shared/images/` | Bundled fonts, logos and character images |
| `ATTACHING.md` | The attach rules, identical in every tool |
| `setup/scripts/` | `save-key.*` (keys in the computer's secure store), `start-task-list.*` (starts the helper, whatever tools are installed), `autostart-*` (start at login). Keep the file names: `.claude/settings.json` and the `open-task-list` skill refer to them |
| `setup/connections/` | One guide per app. Copy the ones the tool needs; when attaching, add any the person doesn't have |
| `context/`, `files/` | The business notes templates and the numbered folders |
| `.claude/skills/` shared ones | `connect-a-tool`, `keep-context-fresh`, `human-email`, `write-like-me`, `polite-chaser`, `file-it`, `open-task-list` |

`window.TaskListOS` is the shared namespace for every tool, whatever the tool is called. A tool's own code uses its own name (Task List OS uses `window.TL`).

## 2. Each tool makes its own

### `apps/installed.json`

A fresh download lists only the tool itself. The first entry is the page http://localhost:4747 opens.

```json
{
  "tools": [
    {
      "id": "pipeline",
      "name": "Pipeline OS",
      "app": "apps/pipeline/",
      "dataFiles": ["apps/pipeline/data/pipeline.json"]
    }
  ]
}
```

- `id`: the tool's id from `catalogue.json`. Lowercase letters, digits and hyphens.
- `app`: `apps/<folder>/`, ending in a slash.
- `dataFiles`: every file the helper may save for this tool. Each must be in the tool's own `data/` folder, `<app>data/<name>.json` (lowercase letters, digits and hyphens in the name, never ending `.backup.json`), so a tool can never save over another tool's data or the shared parts (`apps/shared/`, `apps/server/`). Anything else is ignored. The helper only ever saves listed files, and re-reads this list on every request, so attaching needs no restart.
- When attaching, Claude appends the new tool's entry (taken from its `toolkit.json`). An attached tool not in the catalogue still shows under "Your tools", using its `name` and an optional `icon`.

### `toolkit.json` at the root

As in `ATTACHING.md`. Task List OS's own is the worked example. `sharedVersion` is `"2"`, `attachingVersion` is `"1"`. When a tool is attached into another folder, its `toolkit.json` goes to `apps/<folder>/toolkit.json` so it doesn't overwrite the root one.

### `apps/<folder>/`

- `index.html` with:
  - `<body data-tool="<id>">`
  - stylesheets in this order: `../shared/theme.css` (first: `components.js` finds the images folder from it), `../shared/base.css`, `../shared/sidebar.css`, then the tool's own `app/app.css`
  - the sidebar markup below
  - scripts in this order: `../shared/js/ui.js`, `../shared/js/store.js`, `../shared/js/toolkit-menu.js`, then the tool's own
- `app/`, `data/`, `CLAUDE.md` (the data format, for Claude) and `ATTACH-CLAUDE.md` (copied into the main `CLAUDE.md` under "Attached tools" when attached; see `apps/task-list/ATTACH-CLAUDE.md`).

The sidebar markup every tool uses (copy from `apps/task-list/index.html` and change the tool's name and pages):

```html
<aside class="sidebar" id="sidebar" aria-label="Main">
  <div class="sidebar__brand">...logo, tool name, business name...</div>
  <div data-toolkit-menu="yours" hidden></div>
  <!-- the tool's main button, if it has one -->
  <nav class="nav" id="nav">
    <a class="nav__item" href="#page" data-view="page"><span data-icon="..."></span>Page<span class="nav__count"></span></a>
  </nav>
  <div data-toolkit-menu="more" hidden></div>
  <div class="sidebar__foot">...</div>
</aside>
<div class="sidebar-scrim" data-action="close-sidebar"></div>
```

The page grid (`.shell`) and opening the drawer on phones (adding `sidebar-open` to `<body>`) belong to each tool's own CSS and JavaScript; copy them from `apps/task-list/app/app.css` and `app.js`. Don't put the class `nav__item` on anything without an `href`: the task list's click handler reads it.

### The store

```js
const store = window.TaskListOS.createStore({
  moduleId: "pipeline",                         // the tool's id
  fileName: "pipeline.json",
  dataPaths: ["data", "", "apps/pipeline/data"],
  api: "/api/data/pipeline/pipeline.json",      // the helper's address for this file
  makeDemoData: window.makePipelineDemoData,
  validate: function (d) { /* throw an Error with a plain message if d isn't usable */ },
  onStatus: function (status, detail) { },
  onData: function (data, reason) { }
});
```

Task List OS keeps `api: "/api/tasks"`, which the helper still answers, so existing copies keep working.

### `CLAUDE.md`

Copy the "Other tools in the toolkit" and "Attached tools" sections from Task List OS's `CLAUDE.md` word for word, changing only the tool's name.

### Launcher, README, licence, release script

- A launcher at the root, `Open <Tool name>.html`, copied from `Open Task List.html` with the tool's app folder in place of `apps/task-list/`.
- README: the same "part of a toolkit of 9 free tools" line.
- LICENSE: the same terms, with the tool's name.
- `maintainers/make-release.sh`: copy it and change the checks to the tool's own data file.

## 3. The helper's addresses

| Address | Does |
|---|---|
| `GET /api/alive.js` | Answers if the helper is running (used by the launcher and the start scripts) |
| `GET /api/tasks`, `PUT /api/tasks`, `GET /api/tasks/meta` | The task file, as before. A save must keep its `tasks` list |
| `GET /api/data/<id>/<file>.json` | Reads a data file of an installed tool |
| `PUT /api/data/<id>/<file>.json` | Saves it: the body must be a JSON object, sent as `application/json` from the app itself. A backup (`<file>.backup.json`) is kept and the save can't be half-written |
| `GET /api/data/<id>/<file>.json/meta` | When it last changed, for polling |
| `GET /api/claude/status`, `POST /api/claude/sort-brain-dump` | Task List OS's voice notes only |

Anything else is refused: other websites, disguised addresses, files a tool doesn't list, files outside a tool's own `data/` folder, tools not in `apps/installed.json`, paths outside `apps/`, backup files, and every other request type.

## 4. `catalogue.json`

```json
{
  "catalogueVersion": 1,
  "tools": [
    { "id": "pipeline", "name": "Pipeline OS", "description": "2 plain sentences.", "icon": "trendingUp",
      "app": "apps/pipeline/", "repository": "pipeline-os" }
  ],
  "booking": {
    "url": "https://calendly.com/d/d2bq-8jx-r39/claudit-audit",
    "button": "Book a free call",
    "line": "Get AI Powers sets this up with you on a free call.",
    "showMoreTools": true
  }
}
```

- The 9 ids: `task-list`, `pipeline`, `skill-map`, `proposals`, `content`, `money`, `file-finder`, `whats-new`, `ads`. The menu shows them in this order.
- `icon` is a name from `ui.js`. The toolkit ones: `checkSquare`, `trendingUp`, `map`, `fileText`, `megaphone`, `wallet`, `folder`, `newspaper`, `barChart`, plus `lock` for the padlock.
- The booking link lives only here. The menu adds `utm_source` (the repository of the tool being used, for example `task-list-os`), `utm_medium=toolkit-app` and `utm_campaign` (the id of the locked tool clicked).
- `showMoreTools: false` hides the locked tools completely (for a paying client's own version).

## 5. Testing a tool against shared version 2

On a scratch copy, never the shipped data:

- The menu shows the tool unlocked under "Your tools" and the other 8 locked under "More tools", in catalogue order.
- Each locked tool opens the panel, the button's link carries the right tracking, and Escape and a click outside close it. Keyboard and phone width both work.
- `showMoreTools: false` hides the locked tools.
- The helper saves the tool's data with a backup, refuses an unlisted file, refuses a listed file outside the tool's own `data/` folder, and refuses the tool once it's removed from `apps/installed.json`. Check Node and Python.
- Attach it to a copy of Task List OS (following `ATTACHING.md`): both tools show under "Your tools", each opens, both save.
