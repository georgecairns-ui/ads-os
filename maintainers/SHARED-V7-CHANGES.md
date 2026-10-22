# Shared version 7: what changed since version 6

Shared version 7, 21 October 2026. Everything in `SHARED-V3-CHANGES.md` to `SHARED-V6-CHANGES.md` still applies; this file lists only what's new.

**Made in Content Machine OS first.** It must be copied to Task List OS and every other tool in their next release (both helper files, byte for byte, and the `VERSION` file). Only Content Machine OS has `"media": true`, so nothing changes for the others until a tool turns it on.

**New in version 7:** the helper can keep the photos and videos a person adds to a tool's records, and play them back. Content Machine OS needed it so that a post can carry the real pictures and videos, saved on the person's computer in the tool's own folder.

## What changed

| Path | Change |
|---|---|
| `apps/server/server.js`, `apps/server/server.py` | New `PUT /api/media/<tool>/<name>` and `GET /api/media/<tool>/<name>` (also `HEAD`). Nothing else changed. Existing routes work exactly as before |
| `apps/installed.json` | A tool's entry can have `"media": true` (Content Machine OS has it) |
| `toolkit.json` | The same `"media": true`, so attaching copies it into `apps/installed.json`. `ATTACHING.md` says so |
| `apps/shared/VERSION` | `7` |
| `.gitignore` | `apps/*/data/media/`: a person's own files never go in the repository |
| `maintainers/make-release.sh` | Refuses any file in `apps/*/data/media/` except a `.gitkeep`. Copy the same check into each tool's release script |

Copy both helper files byte for byte, as before.

## What the helper does

- **Saving** (`PUT /api/media/<tool>/<name>`, the body is the raw file). Refused in this order: another website's `Origin` (`403`, the same check the data save makes), a tool that isn't listed in `apps/installed.json` with `"media": true` (`404`), a name that doesn't match `^[a-z0-9][a-z0-9-]{0,60}\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$` (`400`), a `Content-Type` that doesn't match the ending (`415`: `image/jpeg` for `.jpg` and `.jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/quicktime` for `.mov`, `video/webm`), no `Content-Length` (`411`), over 200 MB by its `Content-Length` (`413`, before anything is read), a file of that name already there (`409`, never overwritten). Otherwise the bytes are streamed to `apps/<tool>/data/media/<name>.saving`, checked to be the whole length, and renamed into place. It answers `201` with `{ "file": "<name>" }`. The folder is created on the first save.
- **Playing back** (`GET`, `HEAD`): the file with its own `Content-Type`, `Accept-Ranges: bytes`, and `206` with `Content-Range` for a Range request (so a video plays and skips around), `416` for a range past the end, and a short cache time, because a name is never reused. A missing file is `404`.
- There is no route that deletes or replaces a file, and `DELETE`, `POST` and `PATCH` on the media address are `405`. Files stay on the person's computer.
- Node streams with `stream.pipeline` and Python reads in 64 KB pieces, so a 200 MB video never sits in memory.

## What each tool does

- Nothing, unless it wants photos or videos. To use them: add `"media": true` to the tool's entry in `toolkit.json` and `apps/installed.json`, keep a list of `{ id, file, name, type, size, addedAt }` on the record, build every address with `"/api/media/<tool>/" + encodeURIComponent(file)`, save a file by sending its bytes with `PUT` under a name `m-<6 letters or digits>.<ext>` (retry with a new name on `409`), and keep removing a file from a record separate from deleting it (the helper can't delete). Content Machine OS's `apps/content/app/media.js` is the reference for the saving and the messages.
- Add `apps/*/data/media/` to `.gitignore` and the same refusal to the release script.

## Testing

`node maintainers/test-helper-media.js` (Content Machine OS) runs the whole list below against a scratch copy of each helper, over http, in Node and in Python. It needs a machine that lets it open a local port; it prints `COULD NOT RUN` and exits 2 if not. By hand or in that script, in both helpers:

- A photo is saved (`201`, the same bytes on disk, no `.saving` file left) and plays back with the right type.
- A video answers `Range: bytes=10-19` with `206` and `Content-Range: bytes 10-19/<size>`, `bytes=990-` and `bytes=-5` correctly, and `bytes=5000-` past the end with `416`.
- The same name again is `409` and the first file is unchanged. A `Content-Length` over 200 MB is `413` and nothing is written.
- Bad names (capitals, no ending, `.exe`, `.svg`, a path, over 61 characters, a leading hyphen) are `400`. A wrong `Content-Type` is `415`. No length is `411`.
- A tool without `"media": true`, and one that isn't installed, are `404`, and no folder is made for them. Another website's `Origin` is `403`, and so is a wrong `Host`.
- `DELETE`, `POST` and `PATCH` are `405`. The data save (`PUT /api/data/...`), the Claude jobs and the file serving still work as in version 6.
- In a browser: drag a 100 MB video in, check the progress bar, then play it and skip around in it.
