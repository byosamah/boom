# Contributing to BOOM

## Remotes

| Remote | Points to | Purpose |
|--------|-----------|---------|
| `origin` | Your fork (e.g. `QusaiiSaleem/boom`) | Push your work here |
| `upstream` | `byosamah/boom` | The original repo. Pull updates from here |

You should only have these two. Check with `git remote -v`.

## Workflow: Making Changes

**NEVER commit directly to `main`.** Always use a feature branch.

### Step 1: Sync your main with upstream first

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### Step 2: Create a feature branch

```bash
git checkout -b feature/my-change
```

Name branches descriptively:
- `feature/analytics-phase2` — new feature
- `fix/name-prompt-mobile` — bug fix
- `docs/update-readme` — documentation

### Step 3: Make changes, commit, push

```bash
# Work on your changes...
# Then commit
git add src/MyFile.js
git commit -m "Add my change"

# Push to YOUR fork (not upstream)
git push origin feature/my-change
```

### Step 4: Create a Pull Request

```bash
gh pr create --repo byosamah/boom
```

This creates a PR from your fork's branch to the original repo's `main`.

### Step 5: After PR is merged

```bash
# Switch back to main
git checkout main

# Sync with upstream (now includes your merged changes)
git fetch upstream
git merge upstream/main
git push origin main

# Delete the old feature branch
git branch -d feature/my-change
```

## Quick Reference

```
START NEW WORK:     git checkout main && git pull upstream main && git checkout -b feature/x
PUSH WORK:          git push origin feature/x
CREATE PR:          gh pr create --repo byosamah/boom
AFTER PR MERGED:    git checkout main && git pull upstream main && git push origin main
```

## Development Setup

```bash
# Serve locally
python3 -m http.server 8080
# Open http://localhost:8080
```

## Validating Changes

No tests or linter. Validate JS syntax after edits:

```bash
for f in src/*.js; do node --check "$f" && echo "OK: $f" || echo "FAIL: $f"; done
```

## Analytics Data Check

After making analytics changes, play the game and inspect the data:

```
http://localhost:8080/check-data.html
```
