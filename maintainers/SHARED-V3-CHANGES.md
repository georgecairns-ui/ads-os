# Shared version 3: what every tool copies from Task List OS

Shared version 3, 6 October 2026. Task List OS is the reference. Every other tool in the toolkit (Pipeline OS, Skill and Folder Map OS and the rest) copies the parts below from this folder so they attach to each other and look like one app. `ATTACHING.md` explains why; this file is the exact list. It replaces `SHARED-V2-CHANGES.md`.

**New in version 3:** every tool in the sidebar is a dropdown of its pages; a Home dashboard for the whole app that each tool adds boxes to; the clean look (Figtree font, white and soft grey, outlined cards, near-black main buttons, small Claude terracotta accents) in light and dark with a switch in the top bar; and a `match-my-brand` skill that puts the customer's colours, font and logo on the app during setup.

When a shared part changes here, the number in `apps/shared/VERSION` goes up, a new version of this file is written, and the change is copied into every other tool.

## 1. Copy these unchanged, byte for byte

| Path | What it is |
|---|---|
| `apps/server/server.js`, `apps/server/server.py` | The helper. Serves `apps/` at http://localhost:4747 (which opens Home), saves the data files of installed tools and Home's layout. Same behaviour in both |
| `apps/shared/theme.css` | Every colour, font and size, in a light set and a dark set. A customer's own colours live here; when attaching, keep theirs |
| `apps/shared/base.css` | Buttons, inputs, segmented switches, dialogs, toasts, cards, animation |
| `apps/shared/sidebar.css` | The sidebar: brand, Home link, tool dropdowns (`.tool-group`), pages (`.nav`, `.nav__item`, `.nav__sub`), locked tools, the locked panel, the footer, the phone-width drawer |
| `apps/shared/js/ui.js` | Helpers and icons. Exposes `window.TaskListOS.ui` |
| `apps/shared/js/store.js` | Reading and saving a data file. Exposes `window.TaskListOS.createStore` |
| `apps/shared/js/theme.js` | Light or dark. Load it in `<head>`. Any button with `data-theme-toggle` flips it. Exposes `window.TaskListOS.theme` |
| `apps/shared/js/sidebar.js` | Dropdowns, the other tools in the folder, "More tools" and the Book a free call panel. Exposes `window.TaskListOS.sidebar` (also as `toolkitMenu`) |
| `apps/shared/catalogue.json` | All 9 tools, what each does, and the booking link |
| `apps/shared/VERSION` | `3` then the date, one per line |
| `apps/shared/fonts/`, `apps/shared/images/` | Bundled fonts (Figtree is the app's font; licence in `fonts/OFL.txt`), logos and character images |
| `apps/home/` | Home: `index.html`, `home.js`, `home.css`. Shared by every tool; never change it per tool |
| `ATTACHING.md` | The attach rules, identical in every tool |
| `setup/scripts/` | `save-key.*`, `start-task-list.*` (starts the helper, whatever tools are installed), `autostart-*`. Keep the file names: `.claude/settings.json` and the `open-task-list` skill refer to them |
| `setup/connections/` | One guide per app. Copy the ones the tool needs; when attaching, add any the person doesn't have |
| `context/`, `files/` | The business notes templates and the numbered folders |
| `.claude/skills/` shared ones | `connect-a-tool`, `keep-context-fresh`, `human-email`, `write-like-me`, `polite-chaser`, `file-it`, `open-task-list`, `match-my-brand` |

`window.TaskListOS` is the shared namespace for every tool, whatever the tool is called. A tool's own code uses its own name (Task List OS uses `window.TL`).

## 2. Each tool makes its own

### `apps/installed.json`

A fresh download lists only the tool itself.

```json
{
  "tools": [
    { "id": "pipeline", "name": "Pipeline OS", "app": "apps/pipeline/", "dataFiles": ["apps/pipeline/data/pipeline.json"] }
  ]
}
```

- `id`: the tool's id from `catalogue.json`. Lowercase letters, digits and hyphens.
- `app`: `apps/<folder>/`, ending in a slash.
- `dataFiles`: every file the helper may save for this tool. Each must be in the tool's own `data/` folder, `<app>data/<name>.json` (lowercase letters, digits and hyphens in the name, never ending `.backup.json`), so a tool can never save over another tool's data or the shared parts. The helper re-reads this list on every request, so attaching needs no restart.
- When attaching, Claude appends the new tool's entry (taken from its `toolkit.json`). A tool not in the catalogue still shows in the sidebar, using its `name` and an optional `icon`.

### `toolkit.json` at the root

As in `ATTACHING.md`. Task List OS's own is the worked example. `sharedVersion` is `"3"`, `attachingVersion` is `"1"`. When a tool is attached into another folder, its `toolkit.json` goes to `apps/<folder>/toolkit.json` so it doesn't overwrite the root one.

### `apps/<folder>/menu.json` (new in version 3)

The tool's pages, for its dropdown in every other tool's sidebar and on Home, and the files that draw its Home boxes:

```json
{
  "pages": [
    { "id": "board", "label": "Board", "icon": "columns" },
    { "id": "deals", "label": "All deals", "icon": "list", "children": [
      { "id": "won", "label": "Won and lost", "icon": "check" }
    ] }
  ],
  "home": { "scripts": ["app/model.js", "home-boxes.js"] }
}
```

- `id` is the page's address inside the tool (`../pipeline/#board`). `icon` is a name from `ui.js`. `children` show indented under their page.
- `home.scripts` load in order on Home, after `ui.js`, `store.js`, and `sidebar.js`. The last one registers the boxes.

### `apps/<folder>/home-boxes.js` (new in version 3)

Copy `apps/task-list/home-boxes.js` and change it. It calls:

```js
window.TaskListOS.home.register("pipeline", {
  boxes: [
    { id: "chases", title: "Chases due", icon: "mail", size: 1, defaultOn: false, page: "../pipeline/#chases", render: function () { return "...html..."; } }
  ],
  greetingName: function () { return null; },   // optional: the person's first name, if this tool knows it
  businessName: function () { return null; },   // optional
  start: function (ctx) { /* create the tool's store; when data arrives set this.ready = true and call ctx.refresh() */ },
  action: function (name, el) { /* buttons in a box use data-home-action="pipeline:<name>" */ }
});
```

- `size` is 1 (standard) or 2 (wide) in a 3-column grid. `render` returns the box's inside as HTML, built with `ui.esc` for every value.
- **`defaultOn` is false for every tool except Task List OS.** A box from a tool attached later appears in Home's hidden list and the person switches it on. Home never changes by itself.
- Read and save the tool's data through `window.TaskListOS.createStore` with the same options as the tool's own page, so Demo mode and saving behave the same.
- Use the shared row and stat styles in `apps/home/home.css` (`.hlist`, `.hrow`, `.hrow__title`, `.hrow__sub`, `.hstat`, `.hbox__empty`) so every box looks the same.

### `apps/<folder>/index.html`

- `<body data-tool="<id>">`
- The browser-tab icon: `<link rel="icon" type="image/png" href="../shared/images/claude-icon.png">`
- In `<head>`, in this order: `../shared/theme.css` (first: Task List OS's `components.js` finds the images folder from it), `../shared/base.css`, `../shared/sidebar.css`, `<script src="../shared/js/theme.js">`, then the tool's own `app/app.css`
- Scripts at the end, in this order: `../shared/js/ui.js`, `../shared/js/store.js`, `../shared/js/sidebar.js`, then the tool's own
- A light and dark button in the top bar: `<button type="button" class="icon-btn" data-theme-toggle aria-label="Switch to dark mode"><span data-icon="moon"></span></button>`
- The sidebar markup (copy from `apps/task-list/index.html`, change the tool's name, icon and pages):

```html
<aside class="sidebar" id="sidebar" aria-label="Main">
  <div class="sidebar__brand"><img src="../shared/images/claude-icon.png" alt="" width="30" height="30">
    <div class="sidebar__brand-text"><div class="sidebar__product" id="businessName">Your workspace</div></div></div>
  <a class="side-home" href="../home/"><span data-icon="home"></span>Home</a>
  <div class="side-label">Your tools</div>
  <section class="tool-group" data-tool-group="<id>">
    <button type="button" class="tool-group__head" aria-expanded="true" aria-controls="nav">
      <span class="tool-group__icon"><span data-icon="<icon>"></span></span>
      <span class="tool-group__name"><Tool name></span>
      <span class="tool-group__count" aria-hidden="true"></span>
      <span class="tool-group__chevron"><span data-icon="chevronDown"></span></span>
    </button>
    <div class="tool-group__body">
      <nav class="nav" id="nav" aria-label="<Tool name>">
        <a class="nav__item" href="#page" data-view="page"><span data-icon="..."></span>Page<span class="nav__count" data-count="page"></span></a>
        <div class="nav__sub"><a class="nav__item" href="#sub" data-view="sub">...</a></div>
      </nav>
    </div>
  </section>
  <div data-toolkit-menu="others"></div>
  <div data-toolkit-menu="more" hidden></div>
  <div class="sidebar__foot">...</div>
</aside>
<div class="sidebar-scrim" data-action="close-sidebar"></div>
```

- The tool's own pages live in its own `<section>` so they work even when the shared files can't load. The `[data-icon]` placeholders are swapped for icons by the tool's own start-up code (copy that loop from the end of Task List OS's `app.js`); keep each placeholder inside its wrapper `<span>` as shown.
- Counts: a `.nav__count--accent` count (things waiting for the person) is added up and shown on the tool's name when its dropdown is folded.
- The page grid (`.shell`), the top bar, and opening the sidebar on phones (adding `sidebar-open` to `<body>`) belong to each tool's own CSS and JavaScript; copy them from `apps/task-list/app/app.css` and `app.js`. Don't put the class `nav__item` on anything without an `href`.

### The store

```js
const store = window.TaskListOS.createStore({
  moduleId: "pipeline",
  fileName: "pipeline.json",
  dataPaths: ["data", "", "apps/pipeline/data"],
  api: "/api/data/pipeline/pipeline.json",
  makeDemoData: window.makePipelineDemoData,
  validate: function (d) { /* throw an Error with a plain message if d isn't usable */ },
  onStatus: function (status, detail) { },
  onData: function (data, reason) { }
});
```

Task List OS keeps `api: "/api/tasks"`, which the helper still answers, so existing copies keep working.

### The look

- Use only the variables in `theme.css`; never type a colour into a tool's CSS. Every tool must look right in light and dark: check both.
- Joey's tracker is the model: white and soft grey, 1px outlined cards (10px corners, 12px for columns and sections, 14px for pop-ups), near-black main buttons (`btn--primary`), segmented switches for changing views, colour only where it means something. Claude terracotta (`--color-accent`) is for small touches only: the selected page's icon, counts, "New" tags, focus outlines, today's column.

### `CLAUDE.md`

Copy the "Other tools in the toolkit" and "Attached tools" sections from Task List OS's `CLAUDE.md` word for word, changing only the tool's name, and add the `match-my-brand` line to the skills table.

### Setup

Every tool's own setup ends its "get to know the business" step with the brand step (copy section 5.5 of `setup/05-get-to-know-the-business.md`). When a tool is attached to a folder whose `context/business.md` already has a `## Brand` section, skip it: the look is already theirs.

### Launcher, README, licence, release script

- A launcher at the root, `Open <Tool name>.html`, copied from `Open Task List.html` with the tool's app folder in place of `apps/task-list/`.
- README: the same "part of a toolkit of 9 free tools" line, and the line about setup matching the app to their brand.
- LICENSE: the same terms, with the tool's name.
- `maintainers/make-release.sh`: copy it and change the checks to the tool's own data file. Keep the `apps/home/data` exclusion.

## 3. The helper's addresses

| Address | Does |
|---|---|
| `GET /` | Opens Home (`/home/`) |
| `GET /api/info` | The folder this kit is in, so a page can link to `claude://code/new?q=...&folder=...` (opens Claude Code there with a prompt typed in). Added 7 October 2026; the helper files are otherwise unchanged, so copy them again |
| `GET /api/alive.js` | Answers if the helper is running (used by the launcher and the start scripts) |
| `GET /api/tasks`, `PUT /api/tasks`, `GET /api/tasks/meta` | The task file, as before. A save must keep its `tasks` list |
| `GET /api/data/<id>/<file>.json` | Reads a data file of an installed tool |
| `PUT /api/data/<id>/<file>.json` | Saves it: the body must be a JSON object, sent as `application/json` from the app itself. A backup (`<file>.backup.json`) is kept and the save can't be half-written |
| `GET /api/data/<id>/<file>.json/meta` | When it last changed, for polling |
| `GET`, `PUT /api/data/home/layout.json` | Home's layout: which boxes show, in what order and how wide. Saved in `apps/home/data/`, which never ships |
| `GET /api/claude/status`, `POST /api/claude/sort-brain-dump` | Task List OS's voice notes only |

Anything else is refused: other websites, disguised addresses, files a tool doesn't list, files outside a tool's own `data/` folder, tools not in `apps/installed.json`, paths outside `apps/`, backup files, and every other request type.

## 4. `catalogue.json`

Unchanged from version 2:

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

- The 9 ids: `task-list`, `pipeline`, `skill-map`, `proposals`, `content`, `money`, `file-finder`, `whats-new`, `ads`. The sidebar shows them in this order.
- `icon` is a name from `ui.js`. The toolkit ones: `checkSquare`, `trendingUp`, `map`, `fileText`, `megaphone`, `wallet`, `folder`, `newspaper`, `barChart`, plus `lock` for the padlock.
- The booking link lives only here. The panel adds `utm_source` (the repository of the tool being used, for example `task-list-os`), `utm_medium=toolkit-app` and `utm_campaign` (the id of the locked tool clicked).
- `showMoreTools: false` hides the locked tools completely (for a paying client's own version).

## 5. Testing a tool against shared version 3

On a scratch copy, never the shipped data:

- The sidebar shows Home, the tool as an open dropdown with its pages, and the other 8 locked under "More tools", in catalogue order. Folding the dropdown shows the total waiting, and the choice is remembered.
- Each locked tool opens the panel, the button's link carries the right tracking, and Escape and a click outside close it. Keyboard and phone width both work.
- `showMoreTools: false` hides the locked tools.
- Light and dark both look right on every page; the switch remembers the choice.
- Home: the tool's boxes appear in the hidden list (switched off), can be shown, moved, made wide and saved; they show real data and Demo data.
- The helper saves the tool's data with a backup, refuses an unlisted file, refuses a listed file outside the tool's own `data/` folder, and refuses the tool once it's removed from `apps/installed.json`. Check Node and Python.
- Attach it to a copy of Task List OS (following `ATTACHING.md`): both tools show as dropdowns, each opens, both save, and Home offers both tools' boxes.
