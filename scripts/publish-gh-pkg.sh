#!/usr/bin/env bash
set -euo pipefail

# ── version bump ─────────────────────────────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")
MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
PATCH=$(echo "$CURRENT" | cut -d. -f3)

BUMP="${BUMP:-patch}"
case "$BUMP" in
  major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR+1)); PATCH=0 ;;
  patch) PATCH=$((PATCH+1)) ;;
  *) echo "Unknown BUMP value: $BUMP (use patch/minor/major)" && exit 1 ;;
esac

NEW="$MAJOR.$MINOR.$PATCH"
TAG="desktop-v$NEW"

echo "Bumping $CURRENT → $NEW (tag: $TAG)"

# ── update package.json ───────────────────────────────────────────────────────
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# ── build + test ──────────────────────────────────────────────────────────────
PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH"
npm run build
npm run test:run

# ── commit + tag + push ───────────────────────────────────────────────────────
git add package.json
git commit -m "chore: release $NEW"
git tag "$TAG"
git push origin HEAD
git push origin "$TAG"

echo "✓ Tagged $TAG and pushed — GitHub Actions will publish to GitHub Packages"
