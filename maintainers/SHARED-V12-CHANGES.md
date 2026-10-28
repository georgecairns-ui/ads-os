# Shared version 12: what changed since version 11

Shared version 12, 28 October 2026. Everything in `SHARED-V3-CHANGES.md` to `SHARED-V11-CHANGES.md` still applies; this file lists only what's new.

**Made in Task List OS first,** then copied to the other 6 tools.

**Why:** on 27 October 2026 George decided the 7 tools become lead magnets: demos on getaipowers.com, with the real tools only through a call with Joey. The 7 GitHub repositories go private when the website launches. Until now the copy line in `START-HERE.md` and the `get-updates` skill downloaded with plain `curl` from `github.com/georgecairns-ui/<repository>/archive/refs/heads/main.tar.gz`, which only works while a repository is public. From this version every install and every update uses the person's own GitHub sign-in, the route the Small Business Toolkit already used, so nothing breaks on the day the repositories go private and clients who already installed keep getting updates.

**Nothing is made private by this version.** George does that when the website launches. Until then the new route works for anyone signed in to GitHub, invited or not; after it, only for GitHub accounts Get AI Powers has invited.

## The route

1. `gh auth status`. If not signed in: `gh auth login -h github.com -p https -w` (opens GitHub in the browser to approve the computer). If `gh` is missing: `brew install gh` or the installer from cli.github.com on a Mac, `winget install --id GitHub.cli -e` on Windows.
2. Download the same tarball as before, from GitHub's tarball address, with the sign-in's token:
   `curl -fsSL -H "Authorization: Bearer $(gh auth token)" -o <file> https://api.github.com/repos/georgecairns-ui/<repository>/tarball/main`
   (`curl.exe` on Windows, then `if ($LASTEXITCODE -eq 0) { tar ... }`). It unpacks with `tar --strip-components 1` exactly as before and is still saved as `setup/as-installed/<repository>.tar.gz`.
3. `error: 404` means their GitHub account can't see it: the invitation from Get AI Powers hasn't been accepted, or they're signed in to a different account. `error: 401` means the sign-in has expired. Claude says so plainly and never tries another way in.

**Why `gh auth token` with `curl`, not `gh repo clone` or piping `gh api`:** `gh repo clone` needs git, which most Windows computers don't have, and the copy must stay a plain folder anyway. Piping `gh api .../tarball` into a file works on a Mac, but Windows PowerShell 5.1 re-encodes binary output sent through `>` and corrupts the tarball. `curl` writes the file itself on both, `-f` fails cleanly with no file left behind, and `-S` prints the `404` or `401` Claude needs to tell the person what to do. curl doesn't send the token on to the download server GitHub redirects to (that address carries its own short-lived token).

Tested on 28 October 2026 on a Mac, signed in as `georgecairns-ui`: a public tool and the private `small-business-toolkit` both download and unpack; a repository the account can't see gives `curl: (56) The requested URL returned error: 404` and saves nothing; no sign-in gives `error: 401`. The Windows line was not run on Windows.

## What every tool copies, byte for byte

| Path | Change |
|---|---|
| `.claude/skills/get-updates/SKILL.md` | Step 2 checks the GitHub sign-in first (`gh auth status`, `gh auth login`, installing `gh`), then downloads every tool with the route above. The whole Small Business Toolkit now uses the same line with `small-business-toolkit` instead of a `gh repo clone` that was then packed with `tar`, so git is never needed. Says what `error: 404` and `error: 401` mean. "Public" wording removed. Older saved downloads (from `archive/refs/heads`, or the toolkit's packed clone) still unpack the same way in step 2's "old copies", so an existing install updates normally |
| `apps/shared/VERSION` | `12` |
| `maintainers/SHARED-V12-CHANGES.md` | This file |

`ATTACHING.md` is unchanged (still version 4): its step 1 fetches a tool "the same way they fetched the first kit", which is now this route.

## Each tool adapts

- **`START-HERE.md`, the copy paragraph:** 3 numbered steps for Claude: check the GitHub sign-in, run the copy line for Mac or Windows (tool name, repository and file name as before; `curl -fsSL` with the sign-in's token, from `api.github.com/repos/georgecairns-ui/<repository>/tarball/main`), and what to do on `error: 404` or `error: 401`. "Not linked to the public version" becomes "not linked to the copy online" (Task List OS's `.git` question too).
- **`README.md`:** "What you need" opens with **Access to <Tool name>** (invited GitHub account, accept the email; no account, make a free one and send Get AI Powers the username), the same wording as the Small Business Toolkit. The "Get started" prompt ends "Help me sign in to GitHub first if I need to.", and the line after it says Claude checks the GitHub sign-in first. The note *For Claude, if this README is all you have* reads START-HERE.md with `gh api repos/georgecairns-ui/<repository>/contents/START-HERE.md -H "Accept: application/vnd.github.raw"` instead of a `raw.githubusercontent.com` address, which stops working once a repository is private.
- **`toolkit.json`:** `sharedVersion` `"12"`.
- **`maintainers/make-release.sh`:** fails if any file that ships uses `archive/refs/heads` or `raw.githubusercontent.com`.
- **`maintainers/MAINTAINING.md`:** shared version 12, latest changes file `SHARED-V12-CHANGES.md`.

## Not in this version

- **The Small Business Toolkit** gets this version from its next build, which copies the 7 tools together. Its own `START-HERE.md` already uses `gh`; its build should check the overlay for any `archive/refs/heads` address.
- **The website demos** and their booking links are separate (`website-demos/HANDOVER.md` on the Drive).
- **Inviting clients:** each client's GitHub account must be invited to the repository of each tool they use (or to the toolkit) before or when it goes private, or their next update stops with `error: 404`.

## Older copies

A folder installed before this version has the old `get-updates` skill, which still downloads from the public address. It keeps working until the repositories go private. Any update run before then brings in this version's skill, after which updates use the sign-in. A client who has not updated by the day the repositories go private gets a failed download from the old skill: Claude says so and stops, nothing of theirs changes, and the fix is to ask Claude to "read `.claude/skills/get-updates/SKILL.md` from the latest version with my GitHub sign-in and follow it" or to get Get AI Powers to run the update with them.
