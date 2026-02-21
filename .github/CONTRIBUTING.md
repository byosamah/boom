# Contributing to BOOM

## Git Workflow

Before pushing, check your git remote to determine your workflow:

```bash
git remote -v
```

### If `origin` is a fork (not `byosamah/boom`) — Contributor workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b my-feature
   ```
2. Make your changes and commit
3. Push to your fork:
   ```bash
   git push origin my-feature
   ```
4. Create a Pull Request to `byosamah/boom`:
   ```bash
   gh pr create --repo byosamah/boom
   ```

#### Staying in sync with upstream

```bash
git fetch upstream
git merge upstream/main
```

### If `origin` is `byosamah/boom` — Maintainer workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b my-feature
   ```
2. Make your changes and commit
3. Push directly:
   ```bash
   git push origin my-feature
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
