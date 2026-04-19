#!/usr/bin/env bash
set -euo pipefail
set +x  # never allow xtrace to print tokens

export PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH"

# ── keychain ──────────────────────────────────────────────────────────────────

NPM_TOKEN=$(security find-generic-password -s npm_token -w 2>/dev/null || true)
GH_TOKEN=$(security find-generic-password -s gh_token -w 2>/dev/null || true)

[[ -z "$NPM_TOKEN" ]] && { echo "✗ missing npm_token"; exit 1; }
[[ -z "$GH_TOKEN" ]] && { echo "✗ missing gh_token"; exit 1; }

# ── temp .npmrc (token never in process args or env of child processes) ───────
TMPRC=$(mktemp)
chmod 600 "$TMPRC"
trap 'rm -f "$TMPRC"' EXIT INT TERM

printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" >> "$TMPRC"
printf '//npm.pkg.github.com/:_authToken=%s\n'  "$GH_TOKEN"  >> "$TMPRC"

# Unset from shell env — only the temp file carries them from here
unset NPM_TOKEN GH_TOKEN

# ── git sanity checks ─────────────────────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[[ "$BRANCH" != "main" ]] \
  && echo "✗ Must be on main (currently: $BRANCH)" && exit 1

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ Uncommitted changes — stash or commit first"
  exit 1
fi

# ── version bump ──────────────────────────────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")
MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
PATCH=$(echo "$CURRENT" | cut -d. -f3)

BUMP="${BUMP:-patch}"
case "$BUMP" in
  major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR+1)); PATCH=0 ;;
  patch) PATCH=$((PATCH+1)) ;;
  *) echo "✗ Unknown BUMP: $BUMP (patch/minor/major)" && exit 1 ;;
esac

NEW="$MAJOR.$MINOR.$PATCH"
TAG="v$NEW"

# Guard: tag must not already exist locally or remotely
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "✗ Tag $TAG already exists — was a previous publish interrupted?"
  exit 1
fi

echo "Bumping $CURRENT → $NEW"

# ── update package.json ───────────────────────────────────────────────────────
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# ── build + test ──────────────────────────────────────────────────────────────
npm run build
npm run test:run

# ── publish (auth via temp .npmrc — never in process list) ───────────────────
echo "Publishing to npm.js..."
npm publish --userconfig "$TMPRC" --registry https://registry.npmjs.org --access public

echo "Publishing to GitHub Packages..."
npm publish --userconfig "$TMPRC" --registry https://npm.pkg.github.com

# ── commit + tag + push ───────────────────────────────────────────────────────
git add package.json
git commit -m "chore: release $NEW"
git tag "$TAG"
git push origin HEAD
git push origin "$TAG"

echo ""
echo "✓ $NEW published to npm.js + GitHub Packages (tag: $TAG)"
