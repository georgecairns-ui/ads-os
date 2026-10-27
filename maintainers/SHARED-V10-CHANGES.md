# Shared version 10: what changed since version 9

Shared version 10, 27 October 2026, with `ATTACHING.md` version 4. Everything in `SHARED-V3-CHANGES.md` to `SHARED-V9-CHANGES.md` still applies; this file lists only what's new.

**Made in Task List OS first.** Copy it to every other tool in its next release.

**Why:** a customer's copy is a plain folder with no git, so it never gets updates. George decided Claude applies them on request ("get the latest version"), keeping everything that is the customer's: records, notes, documents, own skills and brand. To tell the customer's changes from the kit's, the skill needs the download as it was installed, so the copy commands now keep it.

## What changed

| Path | Change | Copy to other tools |
|---|---|---|
| `.claude/skills/get-updates/SKILL.md` | New. Reads the repository names from `apps/shared/catalogue.json` and the tools from `apps/installed.json`; names no tool, so it works in every tool and any combination of attached tools. Compares the saved download, the customer's folder and the new download file by file; sorts each as theirs, add, replace, keep or merge; shows what is new and waits for a yes; backs up to `files/99-archive/before-update-<date>/`; checks; replaces the saved download. Restarts the app with whichever open-the-app skill the folder's `CLAUDE.md` names. The private Small Business Toolkit (`toolkit.json` has `"id": "small-business-toolkit"`) is fetched as one piece with the person's own GitHub sign-in. Never uses git in their folder | Byte for byte |
| `ATTACHING.md` | Version 4. Step 1 of attaching also saves the download to `setup/as-installed/<repository>.tar.gz`. Nothing else changed | Byte for byte |
| `setup/as-installed/README.md` | New. Explains the folder to the customer. It is the only file in the folder that ships | Byte for byte |
| `.gitignore` | Ignores `setup/as-installed/*`, keeps `!setup/as-installed/README.md` | Add the 2 lines |
| `apps/shared/VERSION` | `10` | Yes |
| `toolkit.json` | `sharedVersion` `"10"`, `attachingVersion` `"4"` | Yes, with the tool's own other values |

## Each tool adapts

- **`START-HERE.md` copy commands** (Mac and Windows): save the download to `setup/as-installed/<repository>.tar.gz` inside the new folder, then unpack the folder from it. Use the tool's own folder name and repository name. Keep the line saying why the download is kept.
- **`maintainers/make-release.sh`:** refuses any file in `setup/as-installed/` except `README.md`; the copy step keeps the folder's contents out of the zip apart from the README; the "must exist" list gets `setup/as-installed/README.md` and `.claude/skills/get-updates/SKILL.md`.
- **`.claude/skills/README.md`:** a `get-updates` row ("Get the latest version", "any updates?"). The release check fails without it.
- **`CLAUDE.md`:** the same row in the skills table, pointing at `.claude/skills/get-updates`.
- **`setup/09-check-and-hand-over.md`:** 1 line in the hand-over: say "get the latest version" any time.

## Small Business Toolkit

The kit's build copies the 7 tools together and ships one download, so its own copy commands (in its `START-HERE.md`) save the download as `setup/as-installed/small-business-toolkit.tar.gz`. The kit's build also needs the release-check and ignore lines above. Not done here.

## Not changed

A tool attached under ATTACHING version 3 has no saved download. The skill compares its current files with the new ones only, treats every difference as a merge, keeps the customer's where it cannot tell, and saves a download after the first update.
