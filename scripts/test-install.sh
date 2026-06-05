#!/usr/bin/env bash
# Integration smoke-test: packs the library, installs it into a temp project,
# and verifies the public exports can be imported.
#
# Run manually:
#   bun test:install
#
# Not part of CI — only needed before an npm publish to confirm the package
# works as a real consumer would see it.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$REPO_ROOT"
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "▶ Building library…"
  bun run build:nocompress
else
  echo "▶ Skipping build (SKIP_BUILD=1, reusing existing dist/)"
fi

echo "▶ Packing tarball…"
TARBALL="$(npm pack --pack-destination "$TMP_DIR" 2>/dev/null | tail -1)"
TARBALL_PATH="$TMP_DIR/$TARBALL"
echo "  → $TARBALL_PATH"

echo "▶ Creating temp consumer project…"
cd "$TMP_DIR"
cat > package.json <<'EOF'
{
  "name": "fluidity-install-test",
  "type": "module",
  "private": true
}
EOF

# Minimal react stubs so peer deps resolve without installing the full packages
mkdir -p node_modules/react node_modules/react-dom node_modules/react/jsx-runtime
cat > node_modules/react/index.js        <<'EOF'
export default {}; export const createElement = () => {}; export const forwardRef = (fn) => fn; export const useRef = () => ({ current: null }); export const useEffect = () => {}; export const useCallback = () => {}; export const useState = () => [null, () => {}]; export const useImperativeHandle = () => {};
EOF
cat > node_modules/react/package.json    <<'EOF'
{"name":"react","version":"18.0.0","main":"index.js","exports":{".":{"import":"./index.js","default":"./index.js"},"./jsx-runtime":{"import":"./jsx-runtime/index.js","default":"./jsx-runtime/index.js"}}}
EOF
cat > node_modules/react/jsx-runtime/index.js <<'EOF'
export const jsx = () => {}; export const jsxs = () => {}; export const Fragment = null;
EOF
cat > node_modules/react/jsx-runtime/package.json <<'EOF'
{"name":"react/jsx-runtime","version":"18.0.0","main":"index.js","exports":{".":{"import":"./index.js","default":"./index.js"}}}
EOF
cat > node_modules/react-dom/index.js    <<'EOF'
export default {};
EOF
cat > node_modules/react-dom/package.json <<'EOF'
{"name":"react-dom","version":"18.0.0","main":"index.js","exports":{".":{"import":"./index.js","default":"./index.js"}}}
EOF

echo "▶ Installing packed tarball…"
npm install --save "$TARBALL_PATH" 2>/dev/null

echo "▶ Running import smoke test…"
node --input-type=module <<'JSEOF'
import { FluidText, FluidImage } from '@jayf0x/fluidity-js';

const errors = [];

// Named exports must exist and be callable (forwardRef objects are typeof 'object',
// plain functions are typeof 'function' — accept both since stub React differs from real)
if (!FluidText)  errors.push('FluidText not exported');
if (!FluidImage) errors.push('FluidImage not exported');
if (FluidText  == null || !['function','object'].includes(typeof FluidText))
  errors.push(`FluidText unexpected type: ${typeof FluidText}`);
if (FluidImage == null || !['function','object'].includes(typeof FluidImage))
  errors.push(`FluidImage unexpected type: ${typeof FluidImage}`);

if (errors.length) {
  console.error('FAILED:');
  errors.forEach(e => console.error('  ✗', e));
  process.exit(1);
}
console.log(`✓ FluidText   — exported (${typeof FluidText})`);
console.log(`✓ FluidImage  — exported (${typeof FluidImage})`);
JSEOF

echo ""
echo "✓ Integration test passed"
