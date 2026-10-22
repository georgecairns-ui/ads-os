# Shared version 6: what changed since version 5

Shared version 6, 9 October 2026. Everything in `SHARED-V3-CHANGES.md`, `SHARED-V4-CHANGES.md` and `SHARED-V5-CHANGES.md` still applies; this file lists only what's new.

**New in version 6: no demo mode in any kit.** George's rule: the kit people install holds their hand and never shows a made-up business. The demo exists only on the shareable demo page, built outside the repo.

## What changed

| Path | Change |
|---|---|
| `apps/shared/js/store.js` | Demo mode removed: no `makeDemoData` option, no `setDemo` or `isDemo`, no "demo" status, no `task-list-os-demo-mode` flag |
| `apps/shared/js/braindump.js` | The demo check removed |
| `apps/shared/theme.css` | Brand colours (from version 5's release) |
| `apps/shared/VERSION` | `6` |

## What each tool does

- Delete its `app/demo-data.js` and every `makeDemoData`, `setDemo`, `isDemo`, `demo-on`, `demo-off` and "Demo mode" banner, switch or link.
- Ship an empty data file: no example records.
- Before setup (no name and no records), show a short card on the tool's main page and its first Home box saying what to do next: open the folder in the Code tab of the Claude desktop app and type `/setup`, with a copy button. Every other empty state says what fills it and how.
- Keep the sample business for the shareable demo page outside the repo, in `~/Claude/08_Artifacts/<Tool>-Demo/`, with the script that builds that page from the published kit.
- Make the release check refuse demo data or demo code.

## Testing

- A fresh install shows the setup card, never sample data, and no screen mentions a demo.
- The release check fails if `demo-data.js` or any demo code comes back.

## Added later in version 6: typing when there's no microphone

| Path | Change |
|---|---|
| `apps/shared/js/braindump.js` | If the microphone is blocked, missing or can't reach the speech service, the Brain dump box switches to a typing box straight away, keeping anything already heard, and the message ends "Or type it below." Typed notes save with `kind: "typed"`. Before this, a blocked microphone left nowhere to type, so nothing could be saved |

Each tool copies `apps/shared/js/braindump.js`. Nothing else changes and `VERSION` stays `6`.

Test: block the microphone for the app's page (or use a browser with no microphone), press Brain dump, type a note and press Done. The note saves and Claude sorts it.

## Added later in version 6: fits every screen size

Checked from a 320 pixel phone to a 3440 pixel ultrawide. Before this, the page title could be cut to 2 letters on a laptop, the board scrolled sideways below 1280 pixels, and Home sat in a narrow strip on big monitors.

| Path | Change |
|---|---|
| `apps/home/home.css` | Screen height uses `100dvh` (with `100vh` as the fallback) so phones don't hide the bottom behind the browser bar. Home is up to 1520 pixels wide on screens of 1800 pixels or more. The page, its one column on phones and the inside of each box can't grow wider than the screen (`minmax(0, 1fr)` on `.home`, `.home__grid`, `.hbox__body`, `.hlist` and `.hcal`), This week shows 4 days a row instead of scrolling sideways, and a suggestion's name shows in full with Approve and Skip underneath (`.hrow--plan`) |
| `apps/home/index.html` | The Customise button's word is in `.topbar__customise-label`, hidden below 420 pixels (the button keeps its `aria-label`) |

What each tool does in its own `app/app.css` (Task List OS's has all of it):

- `.shell` and `.main`: add `height: 100dvh` after `height: 100vh`.
- Top bar: the page name (`h1`) never shrinks (`flex: none`); the line beside it and the search box give way first. The search box is `flex: 0 1 320px; min-width: 150px`. Below 560 pixels it folds to its icon and opens across the top bar when tapped. "All changes saved" shows as just the dot below 1200 pixels.
- Boards and other side-by-side columns: no sideways scrolling. Make the page a container (`container-type: inline-size`) and use `@container` rules: 2 columns under 1000 pixels (the first column runs down the left), 1 column under 560.
- Pages: on screens of 1800 pixels or more, `.page` is up to 1360 pixels wide, `.page--narrow` 900, and `.page--split` 1420.
- Home boxes with buttons beside a name: add `hrow--plan` to the row so the name gets the full width on phones.

`VERSION` stays `6`.

Test: open every page at 375, 768, 1024, 1440 and 2560 pixels wide. Nothing runs off the side, nothing scrolls sideways, and the page name is always whole.
