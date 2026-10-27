#!/bin/bash
#
# MAKE RELEASE
# ------------
# Builds dist/ads-os.zip: a clean copy of the kit for customers to download.
#
# Run it from the ads-os folder with:   bash maintainers/make-release.sh
#
# What it does:
#   1. Checks the files that ship are still blank templates, so nobody's real ads data, business notes,
#      reports, campaign files, setup progress, photos and videos, or installed claude-ads files can go out
#      by mistake. Stops if not.
#   2. Copies the kit into a temporary folder called "Ads OS", leaving out this
#      maintainers folder, git history, old builds, backups and computer clutter.
#   3. Checks the copy is complete and every data and settings file is valid, and syntax-checks the app's scripts.
#   4. Zips it as dist/ads-os.zip, replacing any older one.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/ads-os-build.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
NAME="Ads OS"
OUT="$STAGE/$NAME"

fail() { echo "RELEASE STOPPED: $1" >&2; exit 1; }

# found <grep arguments>: prints what grep finds. grep exits 0 for a match, 1 for none and 2 when it could not do
# its job (a missing file, say); only 2 stops the release, so a check that couldn't run never passes by accident.
found() {
  local out rc=0
  out=$(grep -s "$@") || rc=$?
  [ "$rc" -le 1 ] || fail "a check could not run (grep exit $rc): grep $*"
  printf '%s' "$out"
}

# ---------- 0. The model's own tests, if they're there ----------
for t in test-model test-approvals; do
  if [ -f "$ROOT/maintainers/$t.js" ]; then
    node "$ROOT/maintainers/$t.js" >/dev/null || fail "node maintainers/$t.js failed. Run it to see why"
  fi
done

# ---------- 1. Is everything that ships still a blank template? ----------
python3 - "$ROOT" <<'PYEOF' || fail "the files above contain real data. Restore them with: git checkout -- apps/ads/data context setup/progress.md CLAUDE.md
  (and remove any installed claude-ads files, any .claude-ads folder, any zip in skills-to-upload, any file in apps/*/data/media and any file but a README in files/04-marketing/ads)"
import json, sys, pathlib, re
root = pathlib.Path(sys.argv[1])
problems = []

# The data file must equal the empty file in maintainers/SPEC.md, exactly
EMPTY = {
    "version": 1,
    "settings": {
        "businessName": "",
        "ownerName": "",
        "currency": "GBP",
        "weekStarts": 1,
        "result": {"name": "", "plural": "", "kind": "", "worth": None, "closeRate": None},
        "targetCostPerResult": None,
        "platformTargets": {},
        "monthlyBudget": None,
        "dailyCap": None,
        "weeklyCap": None,
        "seasons": [],
    },
    "platforms": {},
    "campaigns": [],
    "figures": [],
    "builds": [],
    "summaries": [],
    "suggestions": [],
    "wins": [],
    "imports": [],
    "activity": [],
}
data = json.loads((root / "apps/ads/data/ads.json").read_text())
if data != EMPTY:
    for key in sorted(set(data) | set(EMPTY)):
        if data.get(key) != EMPTY.get(key):
            problems.append(f"apps/ads/data/ads.json: '{key}' is not the blank template")

# The owner's confirmations ship empty: no one's yes can ever come with the kit
approvals = json.loads((root / "apps/ads/data/approvals.json").read_text())
if approvals != {"version": 1, "approvals": []}:
    problems.append("apps/ads/data/approvals.json is not the empty file: it must hold no confirmations")

# No demo mode and no sample data ship
for f in list((root / "apps").rglob("*.js")) + list((root / "apps").rglob("*.html")) + list((root / "apps").rglob("menu.json")):
    txt = f.read_text(errors="ignore")
    if re.search(r"makeDemoData|setDemo|isDemo|demo-data\.js|demo-mode|data-action=\"demo|data-change=\"demo|Demo mode", txt):
        problems.append(f"{f.relative_to(root)} still has demo mode in it")
if (root / "apps/ads/app/demo-data.js").exists():
    problems.append("apps/ads/app/demo-data.js is back: no tool ships a demo")

# Notes: every context file blank, ads.md included
for f in sorted((root / "context").glob("*.md")):
    if f.name != "README.md" and "Status: not filled in yet" not in f.read_text():
        problems.append(f"{f.relative_to(root)} has been filled in")
if not (root / "context/ads.md").exists():
    problems.append("context/ads.md is missing")

# A customer's own skill zip never ships
for z in sorted((root / "skills-to-upload").glob("*.zip")):
    problems.append(f"{z.relative_to(root)} is a customer's own skill and must not ship")

# The claude-ads skills are installed during setup, on the customer's computer, and never ship
skills = root / ".claude/skills"
for d in sorted(list(skills.glob("ads")) + list(skills.glob("ads-*"))):
    problems.append(f"{d.relative_to(root)} is an installed claude-ads skill and must not ship")
for m in sorted(skills.glob(".claude-ads-*.manifest")):
    problems.append(f"{m.relative_to(root)} is claude-ads' install record and must not ship")
agents = root / ".claude/agents"
if agents.exists() and any(agents.iterdir()):
    problems.append(".claude/agents has installed claude-ads agents in it and must not ship")
if (root / ".claude-ads").exists():
    problems.append(".claude-ads is claude-ads' own setup profile and runs, and must not ship")

# Their report downloads and campaign files never ship: only READMEs may sit in files/04-marketing/ads
for f in sorted((root / "files/04-marketing/ads").rglob("*")):
    if f.is_file() and f.name != "README.md":
        problems.append(f"{f.relative_to(root)} is the owner's own ad file and must not ship")

if "Setup status: not started" not in (root / "setup/progress.md").read_text():
    problems.append("setup/progress.md is not blank")
if re.search(r"^- \[[xX]\]", (root / "setup/progress.md").read_text(), re.M):
    problems.append("setup/progress.md has a ticked step")

# The shipped permissions never include a tool that sends, deletes or posts
perms = json.loads((root / ".claude/settings.json").read_text()).get("permissions", {}).get("allow", [])
if any(re.search(r"send|delete|trash|post|forward|reply|publish|schedule", p, re.I) and p.startswith("mcp__") for p in perms):
    problems.append(".claude/settings.json pre-approves a tool that sends, deletes or posts")
# Claude can't write the owner's confirmations without asking: only ads.json and the media folder are pre-approved to write
for p in perms:
    if re.match(r"(Write|Edit)\(\./apps/ads/data", p) and p not in ("Write(./apps/ads/data/ads.json)", "Edit(./apps/ads/data/ads.json)", "Write(./apps/ads/data/media/**)", "Edit(./apps/ads/data/media/**)"):
        problems.append(f".claude/settings.json pre-approves writing more than ads.json and media in apps/ads/data: {p}")
if not any(p == "Write(./apps/ads/data/ads.json)" for p in perms):
    problems.append(".claude/settings.json no longer lets Claude write apps/ads/data/ads.json")
deny = json.loads((root / ".claude/settings.json").read_text()).get("permissions", {}).get("deny", [])
if not any("oogle_ads" in p and "create" in p for p in deny) or not any("eta_ads" in p and "delete" in p for p in deny):
    problems.append(".claude/settings.json has lost its deny list for Google Ads write tools and Meta delete tools")
# No ad account tool is pre-approved at all, so Claude Code asks before every Meta or Google call
if any(p.startswith("mcp__") or re.search(r"meta|facebook|google[-_ ]?ads|adsmanager|ads_", p, re.I) for p in perms):
    problems.append(".claude/settings.json pre-approves an ad account tool: none may be")
if any(re.search(r"\b(curl|wget|ssh|scp|rm|sendmail)\b", p) for p in perms):
    problems.append(".claude/settings.json pre-approves a command that sends or deletes")
# The only commands pre-approved are the start scripts, the claude-ads install scripts and the report
for p in perms:
    if p.startswith("Bash(") and not re.fullmatch(r"Bash\((bash setup/scripts/(start-task-list|install-claude-ads)\.sh|powershell -ExecutionPolicy Bypass -File setup\\scripts\\(start-task-list|install-claude-ads)\.ps1|node apps/ads/app/report\.js:\*)\)", p):
        problems.append(f".claude/settings.json pre-approves a command it shouldn't: {p}")
if "Setup: not done yet" not in (root / "CLAUDE.md").read_text():
    problems.append("CLAUDE.md says setup is done")

# A person's own photos and videos never ship: apps/<tool>/data/media may hold nothing but a .gitkeep
for f in sorted((root / "apps").glob("*/data/media/**/*")):
    if f.is_file() and f.name != ".gitkeep":
        problems.append(f"{f.relative_to(root)} is a person's own photo or video and must not ship")
for p in problems:
    print("  - " + p, file=sys.stderr)
sys.exit(1 if problems else 0)
PYEOF

# ---------- 2. Copy, leaving out what customers don't need ----------
mkdir -p "$OUT" "$DIST"
rsync -a \
  --exclude '.git' --exclude '.gitignore' --exclude 'dist' --exclude 'maintainers' \
  --exclude '.claude/launch.json' --exclude '.claude/settings.local.json' --exclude '.claude/.cc-writes' \
  --exclude '*.backup.json' --exclude '*.tmp-*' --exclude 'apps/home/data' --exclude '.DS_Store' --exclude '._*' --exclude 'Thumbs.db' --exclude 'desktop.ini' \
  --exclude '__pycache__' --exclude '*.pyc' \
  "$ROOT/" "$OUT/"
# Claude Code can leave empty .claude folders around the kit while it works; only the top one ships
find "$OUT" -mindepth 2 -type d -name .claude -empty -prune -exec rm -rf {} +

# ---------- 3. Checks ----------
for f in "START-HERE.md" "CLAUDE.md" "LICENSE" "README.md" "Open Ads OS.html" "apps/ads/index.html" "apps/ads/data/ads.json" "apps/ads/data/approvals.json" "apps/ads/menu.json" "apps/ads/home-boxes.js" "apps/ads/claude-jobs.json" "apps/ads/CLAUDE.md" "apps/ads/ATTACH-CLAUDE.md" "apps/ads/app/app.js" "apps/ads/app/app.css" "apps/ads/app/views.css" "apps/ads/app/model.js" "apps/ads/app/report.js" "apps/ads/app/components.js" "apps/ads/app/charts.js" "apps/ads/app/drawer.js" "apps/ads/app/media.js" "apps/ads/app/settings.js" "apps/ads/app/view-overview.js" "apps/ads/app/view-campaigns.js" "apps/ads/app/view-builds.js" "apps/ads/app/view-week.js" "apps/ads/app/view-health.js" "context/ads.md" "setup/progress.md" "setup/05-get-to-know-the-business.md" "setup/ads-01-install-claude-ads.md" "setup/ads-02-where-your-ads-are.md" "setup/ads-03-your-customer.md" "setup/ads-04-budget-and-results.md" "setup/ads-05-first-look.md" "setup/09-check-and-hand-over.md" "setup/scripts/install-claude-ads.sh" "setup/scripts/install-claude-ads.ps1" "setup/connections/meta-ads.md" "setup/connections/google-ads.md" "files/04-marketing/ads/README.md" "files/04-marketing/ads/exports/README.md" "skills-to-upload/README.md" ".claude/skills/README.md" ".claude/settings.json" ".claude/skills/build-a-campaign/references/campaign-basics.md" ".claude/skills/build-in-account/references/connections.md" ".claude/skills/build-in-account/references/google-ads-editor.md" ".claude/skills/update-my-ads/references/exports.md" "setup/scripts/save-key.sh" "setup/scripts/start-task-list.sh" "apps/server/server.js" "apps/server/server.py" "setup/connections/README.md" "toolkit.json" "ATTACHING.md" "apps/installed.json" "apps/shared/catalogue.json" "apps/shared/VERSION" "apps/shared/sidebar.css" "apps/shared/js/sidebar.js" "apps/shared/js/theme.js" "apps/shared/js/braindump.js" ".claude/skills/sort-brain-dump/SKILL.md" "apps/shared/images/claude-icon.png" "apps/home/index.html" "apps/home/home.js" "apps/home/home.css" "apps/shared/fonts/Figtree-Variable.woff2" "docs/CUSTOMISING.md" "docs/PRIVACY-AND-SAFETY.md"; do
  [ -e "$OUT/$f" ] || fail "missing $f"
done
for f in apps/ads/data/ads.json apps/ads/data/approvals.json apps/ads/menu.json apps/ads/claude-jobs.json toolkit.json apps/installed.json apps/shared/catalogue.json .claude/settings.json; do
  python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$OUT/$f" || fail "$f is not valid"
done
# A fresh download lists only Ads OS, and no test tool ever ships
python3 -c 'import json,sys; t=json.load(open(sys.argv[1]))["tools"]; sys.exit(0 if [x["id"] for x in t]==["ads"] else 1)' "$OUT/apps/installed.json" || fail "apps/installed.json must list only Ads OS"
python3 -c 'import json,sys; t=json.load(open(sys.argv[1])); sys.exit(0 if t.get("id")=="ads" else 1)' "$OUT/toolkit.json" || fail "toolkit.json must have id ads"
[ ! -e "$OUT/apps/test-tool" ] || fail "the test tool is in the release"
# The data file must be listed, in both places that track it
for f in apps/installed.json toolkit.json; do
  python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
entries = d["tools"] if "tools" in d else [d]
for t in entries:
    if t.get("id") == "ads":
        sys.exit(0 if all(x in (t.get("dataFiles") or []) for x in ("apps/ads/data/ads.json", "apps/ads/data/approvals.json")) else 1)
sys.exit(1)
' "$OUT/$f" || fail "$f must list apps/ads/data/ads.json and apps/ads/data/approvals.json (the helper saves only listed files)"
done
# Photos and videos need the helper told this tool keeps them, in both places that track it
for f in apps/installed.json toolkit.json; do
  python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
entries = d["tools"] if "tools" in d else [d]
sys.exit(0 if any(t.get("id") == "ads" and t.get("media") is True for t in entries) else 1)
' "$OUT/$f" || fail "$f must mark the ads tool with \"media\": true"
done
# Every skill toolkit.json lists exists, with a name that matches its folder and a description
python3 - "$OUT" <<'PYEOF' || fail "a skill listed in toolkit.json is missing or has a bad header"
import json, sys, pathlib, re
out = pathlib.Path(sys.argv[1])
bad = []
for s in json.load(open(out / "toolkit.json"))["skills"]:
    f = out / ".claude/skills" / s / "SKILL.md"
    if not f.exists():
        bad.append(f"{s}: no SKILL.md"); continue
    head = f.read_text().split("---")[1] if f.read_text().startswith("---") else ""
    if not re.search(r"^name: " + re.escape(s) + r"$", head, re.M):
        bad.append(f"{s}: name in the header doesn't match the folder")
    if not re.search(r"^description: .{20,}", head, re.M):
        bad.append(f"{s}: no description")
for s in json.load(open(out / "toolkit.json"))["setupSteps"] + json.load(open(out / "toolkit.json"))["contextFiles"]:
    if not (out / s).exists():
        bad.append(f"{s}: listed in toolkit.json but missing")
for b in bad:
    print("  - " + b, file=sys.stderr)
sys.exit(1 if bad else 0)
PYEOF
# The 8 background jobs the app can ask for must each point at a skill that exists (send-to-task-list points at ATTACH-CLAUDE.md)
python3 - "$OUT" <<'PYEOF' || fail "apps/ads/claude-jobs.json must have exactly update-my-ads, build-a-campaign, write-campaign, build-in-account, analyse-campaign, how-did-the-ads-do, what-should-i-change and send-to-task-list, each pointing at a skill (send-to-task-list at ATTACH-CLAUDE.md) and each ending with the closing line"
import json, sys, pathlib
out = pathlib.Path(sys.argv[1])
jobs = json.load(open(out / "apps/ads/claude-jobs.json"))["jobs"]
ok = sorted(jobs) == ["analyse-campaign", "build-a-campaign", "build-in-account", "how-did-the-ads-do", "send-to-task-list", "update-my-ads", "what-should-i-change", "write-campaign"]
ok = ok and "make-account-change" not in jobs   # an account change runs only on screen in Claude Code, never as an unwatched background job
CLOSING = "Change only what the person approved in the app, and nothing else."
# A job's skill is the one its prompt names (write-campaign uses build-a-campaign)
skill_of = lambda n: "build-a-campaign" if n == "write-campaign" else n
for name, j in jobs.items():
    skill = skill_of(name)
    if name == "send-to-task-list":
        # It follows the Task List section of ATTACH-CLAUDE.md rather than a skill
        ok = ok and (out / "apps/ads/ATTACH-CLAUDE.md").exists() and "apps/ads/ATTACH-CLAUDE.md" in j["prompt"] and j["prompt"].rstrip().endswith(CLOSING) and j.get("label")
        continue
    ok = ok and (out / ".claude/skills" / skill / "SKILL.md").exists() and (".claude/skills/" + skill) in j["prompt"] and j["prompt"].rstrip().endswith(CLOSING) and j.get("label")
sys.exit(0 if ok else 1)
PYEOF

# Syntax-check the app's scripts
for f in "$OUT"/apps/ads/app/*.js "$OUT/apps/ads/home-boxes.js"; do
  node --check "$f" || fail "$f has a syntax error"
done
# The install scripts must parse, and the 2 of them must agree on the version they pin
bash -n "$OUT/setup/scripts/install-claude-ads.sh" || fail "setup/scripts/install-claude-ads.sh has a syntax error"
SH_TAG=$(sed -n 's/^TAG="\(.*\)"$/\1/p' "$OUT/setup/scripts/install-claude-ads.sh")
SH_COMMIT=$(sed -n 's/^COMMIT="\(.*\)"$/\1/p' "$OUT/setup/scripts/install-claude-ads.sh")
PS_TAG=$(sed -n "s/^\$Tag = '\(.*\)'[[:space:]]*$/\1/p" "$OUT/setup/scripts/install-claude-ads.ps1")
PS_COMMIT=$(sed -n "s/^\$Commit = '\(.*\)'[[:space:]]*$/\1/p" "$OUT/setup/scripts/install-claude-ads.ps1")
[ -n "$SH_TAG" ] && [ -n "$SH_COMMIT" ] || fail "could not read the pinned version from install-claude-ads.sh"
[ "$SH_TAG" = "$PS_TAG" ] && [ "$SH_COMMIT" = "$PS_COMMIT" ] || fail "install-claude-ads.sh pins $SH_TAG ($SH_COMMIT) but the .ps1 pins $PS_TAG ($PS_COMMIT)"
[ ${#SH_COMMIT} -eq 40 ] || fail "the pinned commit in install-claude-ads.sh is not 40 characters"
# No stray backup or in-progress save files
if find "$OUT" -name '*.backup.json' -o -name '*.tmp-*' -o -name '__pycache__' | grep -q .; then
  fail "a backup, in-progress save file or __pycache__ was left in the kit: $(find "$OUT" -name '*.backup.json' -o -name '*.tmp-*' -o -name '__pycache__' | head -3)"
fi

# No em dash anywhere shipped, except the vendored shared fonts licence
HITS=$(found -rIl $'\xe2\x80\x94' "$OUT" --exclude='OFL.txt')
[ -z "$HITS" ] || fail "an em dash slipped in: $(printf '%s\n' "$HITS" | head -3)"
# No customer-banned words in README.md and START-HERE.md
BANNED='leverage|synergy|game-changer|seamless|cutting-edge|streamline|empower|unlock|robust|holistic|transformative|AI-powered|going forward|touch base|circle back|to be fair|at the end of the day|GAIP'
HITS=$(found -EinH "$BANNED" "$OUT/README.md" "$OUT/START-HERE.md")
[ -z "$HITS" ] || fail "a banned word is in README.md or START-HERE.md: $(printf '%s\n' "$HITS" | head -3)"
# The old tool's name must not linger in anything this tool owns. (ATTACHING.md and apps/shared,
# apps/home and apps/server are shared and may name other tools.) Every path is checked to exist first.
OLD='content machine|content-machine|content\.json|apps/content|skill-map|skill map|skillmap|skill and folder map|skill-and-folder|Pipeline OS Licence|Vault|Ads Dashboard|ads-dashboard'
OLD_PATHS=("$OUT/README.md" "$OUT/START-HERE.md" "$OUT/CLAUDE.md" "$OUT/LICENSE" "$OUT/toolkit.json" "$OUT/Open Ads OS.html" "$OUT/docs" "$OUT"/setup/*.md "$OUT/context" "$OUT/apps/ads" "$OUT/apps/installed.json" "$OUT/skills-to-upload" "$OUT/.claude/settings.json" "$OUT/.claude/skills/README.md")
for skill in setup update-my-ads build-a-campaign build-in-account analyse-campaign make-account-change how-did-the-ads-do what-should-i-change my-ads-check-in; do
  OLD_PATHS+=("$OUT/.claude/skills/$skill")
done
for path in "${OLD_PATHS[@]}"; do
  [ -e "$path" ] || fail "the old-name check expects $path and it isn't there"
done
HITS=$(found -rEiIl "$OLD" "${OLD_PATHS[@]}")
[ -z "$HITS" ] || fail "an old tool name is still in a file this tool owns: $(printf '%s\n' "$HITS" | head -3)"
# Customer-facing words: the README, START-HERE, docs, setup steps and this tool's own skills never say these
HITS=$(found -rEinH "\b(delve|game-changer|elevate|unlock|seamless|leverage|empower|streamline)\b" "$OUT/README.md" "$OUT/START-HERE.md" "$OUT/docs" "$OUT"/setup/ads-*.md "$OUT"/setup/0*.md "$OUT"/.claude/skills/{update-my-ads,build-a-campaign,build-in-account,analyse-campaign,make-account-change,how-did-the-ads-do,what-should-i-change,my-ads-check-in})
[ -z "$HITS" ] || fail "a banned word is in the README, START-HERE, docs, setup steps or the ads skills: $(printf '%s\n' "$HITS" | head -3)"
# Words that belong to builders, not customers, in what the app shows on screen: the text in the page and
# every quoted piece of text with a space in it (a quoted name with no space is code, not wording)
python3 - "$OUT" <<'SCREENEOF' || fail "a word customers shouldn't see is in what the app shows (listed above)"
import pathlib, re, sys
out = pathlib.Path(sys.argv[1])
WORDS = re.compile(r"\b(agent|repo|repository|artifact|JSON|schema|API|MCP)\b", re.I)
STRING = re.compile(r'"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\'')
problems = []

def strip_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(^|\s)//[^\n]*", r"\1", text)

for f in sorted((out / "apps/ads/app").glob("*.js")) + [out / "apps/ads/home-boxes.js"]:
    for lit in STRING.findall(strip_comments(f.read_text())):
        m = WORDS.search(lit)
        if " " in lit and m:
            problems.append(f"{f.relative_to(out)}: '{m.group(0)}' in {lit[:70]}")

page = (out / "apps/ads/index.html").read_text()
page = re.sub(r"<!--.*?-->|<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
shown = re.findall(r">([^<>]+)<", page) + re.findall(r'(?:title|aria-label|placeholder|alt|content)="([^"]*)"', page)
for text in shown:
    m = WORDS.search(text)
    if m:
        problems.append(f"apps/ads/index.html: '{m.group(0)}' in {text.strip()[:70]}")

for line in problems:
    print("  - " + line, file=sys.stderr)
sys.exit(1 if problems else 0)
SCREENEOF

SKILLS=$(find "$OUT/.claude/skills" -name SKILL.md | wc -l | tr -d ' ')

# ---------- 4. Zip (COPYFILE_DISABLE stops macOS adding hidden ._ files) ----------
rm -f "$DIST/ads-os.zip"
(cd "$STAGE" && COPYFILE_DISABLE=1 zip -rqX "$DIST/ads-os.zip" "$NAME")
echo "Built dist/ads-os.zip ($(du -h "$DIST/ads-os.zip" | cut -f1 | tr -d ' '), $SKILLS skills)"
