# Put these back, and remove `gh` from the shared v13 release rule, on the day the repositories go private.

While the repositories are public, install and updates use a plain download with no GitHub account (shared version 13). The text below is the shared version 12 wording, kept exactly as it was, for when the repositories go private again. Put each piece back in the file named above it, and take `gh (auth|api|repo)` out of the sign-in rule in `maintainers/make-release.sh`.

## START-HERE.md: the copy paragraph (steps 1 to 3 with the sign-in check)

Replaces the paragraph that starts "Copy it as a plain folder" and ends with the line "If the download fails, check their internet connection and run the line again. Don't try another way in."

```markdown
Copy it as a plain folder, so it's theirs alone and not linked to the copy online. Ads OS is private: Get AI Powers gives access by inviting their GitHub account, so the copy uses their own GitHub sign-in.
  1. Check they're signed in: `gh auth status`. If they're not, give them the one line `gh auth login -h github.com -p https -w`, say it opens GitHub in their browser to approve this computer, and wait. If `gh` isn't installed, help them install it first (Mac: `brew install gh`, or the installer from cli.github.com; Windows: `winget install --id GitHub.cli -e`, then open a new PowerShell window).
  2. Copy it with the line for their computer:
     - Mac: `D="$HOME/Documents/Ads OS"; mkdir -p "$D/setup/as-installed" && curl -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$D/setup/as-installed/ads-os.tar.gz" https://api.github.com/repos/georgecairns-ui/ads-os/tarball/main && tar -xzf "$D/setup/as-installed/ads-os.tar.gz" --strip-components 1 -C "$D"`
     - Windows (PowerShell): `$d = "$HOME\Documents\Ads OS"; New-Item -ItemType Directory -Force "$d\setup\as-installed" | Out-Null; curl.exe -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$d\setup\as-installed\ads-os.tar.gz" https://api.github.com/repos/georgecairns-ui/ads-os/tarball/main; if ($LASTEXITCODE -eq 0) { tar -xzf "$d\setup\as-installed\ads-os.tar.gz" --strip-components 1 -C "$d" }`
  3. If it stops with `error: 404`, their GitHub account can't see Ads OS yet: they haven't accepted the invitation from Get AI Powers, or they're signed in to a different GitHub account (`gh auth status` names it). Ask them to accept the invitation from the email GitHub sent them (it's also at github.com/notifications), then run the line again. If they never had an invitation, tell them to ask Get AI Powers. With `error: 401`, the sign-in has expired: ask them to run `gh auth login -h github.com -p https -w` again. Don't try another way in.
```

## START-HERE.md: the "already copied it another way" paragraph (v12)

```markdown
  If you've already copied it another way (for example with `git clone`, or into a different folder), that's fine: use that folder. Then give them the one line to open it, `cd ~/Documents/"Ads OS" && claude` (in the Claude desktop app: open the Code tab and choose that folder), tell them to pick "Yes, I trust this folder", then type `/setup`. Stop there; don't start the setup from the wrong folder. Follow this file, then the step files in `setup/`, in order.
```

## get-updates, step 2 (v12): the sign-in and the downloads

Replaces the plain download in `.claude/skills/get-updates/SKILL.md` step 2: the **Their GitHub sign-in** paragraph goes back before "**The downloads.**", and the download lines and the failure text are replaced by this.

```markdown
**Their GitHub sign-in.** Every tool is private: Get AI Powers gives access by inviting the person's GitHub account, and every download uses their own sign-in. Check it first with `gh auth status`. If they are not signed in, give them the one line `gh auth login -h github.com -p https -w`, say it opens GitHub in their browser to approve this computer, and wait. If `gh` is not installed, help them install it (Mac: `brew install gh`, or the installer from cli.github.com; Windows: `winget install --id GitHub.cli -e`, then open a new PowerShell window).

**The downloads.** For each tool in `apps/installed.json`, find its `repository` in the catalogue (for the whole toolkit, `small-business-toolkit`, once), and run, with `<T>` the path you noted:

- Mac: `T="<T>"; mkdir -p "$T/new/<repository>" && curl -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$T/new/<repository>.tar.gz" https://api.github.com/repos/georgecairns-ui/<repository>/tarball/main && tar -xzf "$T/new/<repository>.tar.gz" --strip-components 1 -C "$T/new/<repository>"`
- Windows (PowerShell): `$T = "<T>"; New-Item -ItemType Directory -Force "$T\new\<repository>" | Out-Null; curl.exe -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$T\new\<repository>.tar.gz" https://api.github.com/repos/georgecairns-ui/<repository>/tarball/main; if ($LASTEXITCODE -eq 0) { tar -xzf "$T\new\<repository>.tar.gz" --strip-components 1 -C "$T\new\<repository>" }`

`-f` makes curl stop with an error on a failed download instead of saving the error page as if it were the kit. If a download fails, say so in 1 sentence and stop:

- `error: 404`: their GitHub account cannot see that tool. Either they have not accepted the invitation from Get AI Powers yet, or they are signed in to a different GitHub account (`gh auth status` names it). Ask them to accept the invitation from the email GitHub sent them (it is also at github.com/notifications), then try again. If they never had an invitation, tell them to ask Get AI Powers.
- `error: 401`: the sign-in has expired. Ask them to sign in again with `gh auth login -h github.com -p https -w`.

Do not try another way in.
```

## README.md, "Access to" wording (v12)

The item in "What you need":

```markdown
- **Access to Ads OS.** It's private: Get AI Powers invites your GitHub account. Accept the invitation from the email GitHub sends you. (No GitHub account? Make a free one at github.com and send Get AI Powers your username.)
```

The prompt in "Get started", with the line after it (Ads OS's version 12 README had no note for Claude):

```markdown
> Copy Ads OS from https://github.com/georgecairns-ui/ads-os into a folder called "Ads OS" in my Documents, using the copy line in its START-HERE.md (not git), then tell me how to open it and set it up. Help me sign in to GitHub first if I need to.

   Claude checks you're signed in to GitHub (if not, it gives you one line that opens GitHub in your browser to approve this computer), copies everything onto your computer and gives you one line to open the new folder. In the desktop app, you choose the folder instead.
```
