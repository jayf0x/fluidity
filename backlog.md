
## CORE/BUG: Text flicker near obstacle edges

**Status:** ✅ resolved
**Fix:** All density samples clamped with `max(..., 0.0)` in `displayShader`.

---

## CORE/BUG: FluidImage whitespace not interactive / backgroundColor invisible

**Status:** ✅ resolved
**Fix:** WebGL context uses `alpha:true`, `clearColor(0,0,0,0)`, premultiplied alpha output in `displayShader`. Coverage texture masks transparent areas. `backgroundColor` CSS prop applied to container div on both `FluidText` and `FluidImage`.

---

## CORE/BUG: Bool prop naming violates is/has/can convention

**Status:** ✅ resolved
**Fix:** `useMouse` → `isMouseEnabled`, `worker` → `isWorkerEnabled` across all files.

---

## CORE/FEATURE: Rendering algorithm prop

**Status:** ✅ resolved
**Fix:** `algorithm` prop on `FluidText` and `FluidImage`. Five named modes: `standard`, `glass`, `ink`, `aurora`, `ripple` (maps to `uAlgorithm int` in `displayShader`). Controllable via Leva panel in SplitExample.

---

## CORE/FEATURE: Background image on canvas

**Status:** ✅ resolved
**Fix:** `backgroundSrc` prop (URL/path) on both components. Loads bitmap via `loadImageBitmap`, transfers to worker (zero-copy), composited behind text/image in `createTextTextures`/`createImageTextures`. Optional `backgroundSize` prop.

---

## CORE/FEATURE: Rewrite src/ in TypeScript (TS/TSX)

**Status:** ✅ resolved
**Fix:** All `src/**/*.js/.jsx` → `.ts/.tsx`. Explicit types throughout. `tsconfig.json` updated (`allowJs` removed). `vite.config.js` entry updated to `src/index.ts`. All 67 tests pass.

---

## BUILD/BUG: package.json declares UMD output that doesn't exist

**Status:** ✅ resolved
**Fix:** Removed `"main"` and `"require"` from `package.json` exports. ESM-only.

---

## DEMO: Full Leva controls, isolated stores, presets prefill

**Status:** ✅ resolved
**Fix:** Per-page `createStore()`, `useFluidControls` hook, all examples use Leva. PresetsExample prefills sliders on preset change.

---

## DEMO/FEATURE: SEO

**Status:** ✅ resolved
**Fix:** Meta tags added to `demo/index.html`.

---

## GITHUB/FEATURE: Repo setup

**Status:** ✅ resolved
**Fix:** MIT license, README with full props/API docs, GitHub Pages deploy workflow.
