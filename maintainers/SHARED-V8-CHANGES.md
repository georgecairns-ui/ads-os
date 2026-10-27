# Shared version 8: what changed since version 7

Shared version 8, 23 October 2026. Everything in `SHARED-V3-CHANGES.md` to `SHARED-V7-CHANGES.md` still applies; this file lists only what's new.

**Made in Task List OS first,** after an end-to-end install test as a new customer. Copy it to every other tool in its next release.

**Why:** the brand step in setup couldn't read a website (the usual web page reader throws the styling away, so it saw no colours, fonts or logo), a wide logo was squashed into a 30 by 30 square, a dark logo vanished in dark mode, and the release check would ship a business's own logo, fonts, colours, documents and skills.

## What changed

| Path | Change | Copy to other tools |
|---|---|---|
| `.claude/skills/match-my-brand/SKILL.md` | Rewritten: uses the website from setup step 1; downloads the page and its stylesheets and reads the colour settings, fonts and logo from them (square icon first); writes a `/* Brand: ... */` line in `theme.css` (above Figtree's `@font-face` lines); downloads with a full browser name, since some shops refuse a short one; changes both dark sets; adds the font's line to `OFL.txt`; marks wide logos `sidebar__brand--wordmark` and dark ones `sidebar__brand--chip`; checks the result in light and dark | Byte for byte |
| `apps/shared/sidebar.css` | The brand image uses `object-fit: contain`; new `.sidebar__brand--wordmark` (logo at its own shape, up to 176px wide, in place of the business name) and `.sidebar__brand--chip` (a light card behind the logo in dark mode) | Byte for byte |
| `apps/shared/theme.css` | New `--color-logo-chip` (transparent in light, `#F5F3EE` in both dark sets). Header comment says the dark set is written twice. The old slab-serif footnote is now a Source Serif 4 one | Copy the new variable and comments; keep any tool-specific values |
| `apps/shared/fonts/OFL.txt` | Adds Source Serif 4's copyright line (it was bundled without one) | Byte for byte |
| `apps/shared/VERSION` | `8` | Yes |
| `maintainers/make-release.sh` | Also refuses: anything in `files/` except the READMEs; a skill in `.claude/skills/` not named in `.claude/skills/README.md`; a `/* Brand:` line in `theme.css`; `apps/shared/images/brand-logo*`; an `index.html` pointing at `brand-logo` or using `sidebar__brand--`; `theme.css` or any file in `fonts/` that differs from the kit's own, recorded as checksums in `maintainers/shipped-look.txt` (this catches a restyle even without the `/* Brand:` line). After changing the kit's own look on purpose, run `bash maintainers/make-release.sh --record-look` | Copy the checks into each tool's own script, and record each tool's own `shipped-look.txt` |

## Task List OS only (not shared)

- `START-HERE.md`: the copy command downloads a plain folder (no git needed). A folder copied with `git clone` is offered an unlink (removing `.git`), only when setup hasn't started, `git status` is clean and `git branch` shows only `main`. Each tool's START-HERE should get the same.
- `setup/01-quick-questions.md`: question 1 asks for the website; new check 1.1.5 reads the conversation and any notes in `context/` and `files/`, and drops questions already answered; the `/mcp` check is replaced by "check your own list of connections". `setup/05-get-to-know-the-business.md` uses the website from step 1.
- `setup/connections/*.md`: the `/mcp` check replaced the same way, with a note that a connector added part-way through may need Claude Code closing and opening again (not verified with Anthropic's docs).
- `apps/task-list/app/view-preferences.js`: the colour picker reads each category's colour from `theme.css` instead of a hard-coded clay.
- Stale wording fixed in `apps/task-list/CLAUDE.md`, `apps/task-list/data/tasks.json` (about), `setup/09-check-and-hand-over.md`, `docs/CUSTOMISING.md`, `README.md` (fonts) and `setup/connections/README.md` (path).
