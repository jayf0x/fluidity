
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd demo
bun run build

cd $REPO_ROOT

git add .
git commit -m "Releasing demo site"
git push origin main