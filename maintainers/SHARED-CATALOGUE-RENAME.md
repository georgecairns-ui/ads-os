# Catalogue changes in this kit

`apps/shared/catalogue.json` and `ATTACHING.md` in this kit are the toolkit's copies as of 22 October 2026 (the same as every other tool's `main`, with Proposal Writing OS and without File Finder OS), plus the Ads OS changes below. They are shared files, so the same Ads OS lines go to every other tool by pull request.

## `ads`: Ads OS (21 and 22 October 2026)

In `catalogue.json`, the `ads` entry now has:

- `name`: "Ads OS"
- `repository`: `ads-os`
- `description`: "Your Google and Meta ads on one plain-English screen. Claude builds and analyses your campaigns and makes the changes you approve, and nothing spends until you say yes."

The id (`ads`), icon (`barChart`) and app folder (`apps/ads/`) are unchanged. The previous entry was "Ads Dashboard OS", repository `ads-dashboard-os`.

In `ATTACHING.md`:

- The toolkit table row reads `ads-os` / Ads OS / `apps/ads/` / "Google and Meta ads on one plain-English screen, with campaigns Claude builds and runs once you say yes".
- The "Who reads and sends what" row reads "Ads OS | Pipeline (deals won from ads) | Tasks: approved ad changes, and campaigns waiting to be switched on. Pipeline: new Meta leads as suggested deals. Money view reads ad spend itself, as money going out".

Nothing else in either file differs from the other tools.
