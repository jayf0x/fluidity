#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH"

cd "$REPO_ROOT/demo"
pnpm build

git add dist
git commit -m "chore: deploy demo"
git push origin main

npx gh-pages -d dist --dotfiles

echo ""
echo "✓ Demo deployed to gh-pages branch → https://jayf0x.github.io/fluidity"
