
## BUILD/BUG: package.json declares UMD output that doesn't exist

**Status:** ready
**Effort:** XS

`package.json` has `"main": "./dist/fluidity-js.umd.cjs"` and `exports.require` pointing to the same file. `vite.config.js` only builds `formats: ['es']` — no UMD file is ever produced. CJS consumers (`require('fluidity-js')`) get a file-not-found error.

**Fix:**
- Remove `"main"` field from `package.json`
- Remove `"require"` entry from `exports['.']`
- Keep `"module"` + `"exports['.']['import']`

**Note:** Build script is `"vite build"` only — doesn't run `tsc`. Types in `types/` are manually maintained. After TSX rewrite (see below), script should become `"tsc && vite build"`.

---

## DEMO/BUG: Leva "fluid config" panel missing from some pages

**Status:** ready
**Effort:** S

`PresetsExample` never calls `useFluidControls(ref)` — the shared "fluid config" section is absent. Also, selecting a preset should prefill all sliders rather than re-mounting the component.

**Fix:**
1. `useFluidControls.ts` — switch to tuple form: `const [values, set] = useControls('fluid config', () => schema)`. Return `{ set }`. Add `rgbArrayToHex` helper (inverse of existing `hexToRgb`).
2. `PresetsExample.tsx` — call `useFluidControls(ref)`, get `{ set }`. On `preset` change: build full patch from `{ ...DEFAULT_CONFIG, ...PRESETS[preset] }`, convert RGB arrays → hex, call `set({...})`. Remove `preset` prop and `key={preset}` from `<FluidText>`.

---

## DEMO/BUG: Leva config bleeds between pages (not session-scoped)

**Status:** ready
**Effort:** M

All examples call `useControls('fluid config', ...)` with the same key → single shared Leva global store entry. Settings changed on TextExample carry over to PresetsExample.

**Fix:** Per-page isolated Leva stores via `createStore()` (Leva ≥ 0.8, installed v0.10.1).

1. `useFluidControls(ref, store?)` — accepts optional store, passes `{ store }` to `useControls`.
2. Each example: `const pageStore = createStore()` outside component (stable across remounts). Pass to `useFluidControls` + each `useControls('settings', ...)` call. Render `<Leva store={pageStore} />` inside component for panel.
3. `App.tsx` — add `<Leva hidden />` to suppress default auto-rendered global panel.

Store lives in module scope → values persist within JS session (navigate away/back = settings restored). Hard refresh = clean defaults.

---

## CORE/BUG: backgroundColor prop invisible (opaque WebGL canvas covers it)

**Status:** ready
**Effort:** M

`FluidImage.backgroundColor` (added last session) applies CSS `background` on the container div, but the WebGL canvas sits `position:absolute; inset:0` over it with an opaque render → CSS colour never visible. `FluidText` has no `backgroundColor` prop at all. The test background (red) in `TextExample` confirms this.

**Root cause:** WebGL context uses default `alpha: false`, `gl.clearColor(0,0,0,1)` — canvas is opaque.

**Fix:**
1. `gl-utils.js` `initWebGL` — add `{ alpha: true }` to context creation options.
2. `simulation.js` — change `gl.clearColor(0, 0, 0, 1)` → `gl.clearColor(0, 0, 0, 0)`.
3. `shaders.js` `displayShader` — make background areas transparent: when `density == 0` and `obs == 0`, output alpha = 0. Practical approach: output `vec4(color, max(density * 1.5, obs))` or similar so empty canvas is transparent.
4. `FluidText.jsx` — add `backgroundColor = '#0a0a0a'` prop, apply CSS on container div (now visible through transparent canvas).
5. `types/index.d.ts` — add `backgroundColor` to `FluidBaseProps` (both components share it).

---

## CORE/BUG: Bool prop naming violates is/has/can convention

**Status:** ready — naming confirmed: `isMouseEnabled` + `isWorkerEnabled`
**Effort:** S (breaking change — bump to 0.2.0)

`useMouse: boolean` is a verb phrase, not a predicate. `worker: boolean` is a noun. Convention: all boolean props must use `is`/`has`/`can` prefix.

**Renames:**
- `useMouse` → `isMouseEnabled`
- `worker` → `isWorkerEnabled`

**Scope:** `FluidText.jsx`, `FluidImage.jsx`, `fluid-controller.js`, `useFluid.js`, `types/index.d.ts`, all tests, `README.md`, all demo examples.

**Enforcement:** Add a comment block in `types/index.d.ts` documenting the convention. Consider ESLint rule (`boolean-prop-naming`) in a follow-up.

---

## CORE/FEATURE: Rewrite src/ in TypeScript (TS/TSX)

**Status:** ready (do after bool rename — both are breaking passes)
**Effort:** L

Source is `.js`/`.jsx` with handwritten `types/index.d.ts`. `tsconfig.json` has `allowJs:true, checkJs:false` — no actual type-checking happens on source.

**Steps:**
1. Rename all `src/**/*.js` → `.ts`, `*.jsx` → `.tsx`.
2. Add explicit types throughout (fn params, returns, class private fields).
3. `tsconfig.json`: remove `allowJs`, set `checkJs` removal irrelevant, keep `declaration:true, declarationDir:"./types"`.
4. `vite.config.js`: entry `src/index.js` → `src/index.ts`.
5. `package.json` build: `"tsc --noEmit && vite build"` (separate type emit handled by vite-plugin-dts or manual tsc step).
6. Delete handwritten `types/index.d.ts` — auto-generated replaces it.
7. Update vitest `include` pattern to cover `.ts/.tsx`.
8. All 65 tests must pass.

**Prerequisite:** Complete bool rename first (smaller surface, avoids double-touching files).

---

## CORE/BUG: core cursor effect for images is off

**Status:** ⚠️ NEEDS USER CONFIRMATION — desired effect not decided yet. Do not implement without confirming approach with user first.
**Effort:** M–L (depends on chosen approach)

**Current behavior:** hovering image pushes white fluid on top, black background bleeds through where fluid displaces image pixels.

**Two candidate approaches — user must pick one:**

---

### Option A — UV Warp (distort the image itself)
Cursor stirs the image like wet paint. Image pixels displace and flow. No new color added — only the image's own pixels move.

**How:** In `displayShader`, instead of compositing white density over background, sample `uBackground` at a UV offset driven by the velocity field:
```glsl
// pass uVelocity as additional texture unit
vec2 vel = texture2D(uVelocity, vUv).xy;
vec2 warpedUv = vUv + vel * uWarpStrength;
vec3 color = texture2D(uBackground, warpedUv).rgb;
// add specular on top for liquid feel
color += spec * uGlowColor;
```
- Density FBO kept for physics only (no longer drives color)
- Add `warpStrength: 0.015` to config (replaces `refraction` role for image mode)
- Need to bind velocity FBO to display program (extra texture unit)
- **Feel:** liquid lens / ripple. Image smears and flows. Returns to original when cursor leaves (velocity dissipates).

---

### Option B — Refraction Only (glass-lens distortion)
Cursor creates a refractive lens effect — image appears to bulge, ripple, or warp under the cursor like looking through moving water. No new color. Image stays intact and snaps back.

**How:** Current display shader already does refraction via density-computed normals. Replace density opacity blend with pure refraction — no color overlay, only UV shift:
```glsl
float density = max(texture2D(uTexture, vUv).r, 0.0);
// normals from density gradient (same as now)
vec2 refrUv = vUv + normal.xy * uRefraction * density;
vec3 color = texture2D(uBackground, refrUv).rgb; // no mix with waterColor
color += spec * uGlowColor * density;
```
- Minimal change — remove `mix(bg, uWaterColor, ...)` line, keep everything else
- `waterColor` becomes irrelevant for image mode
- **Feel:** water surface / glass. Cursor area distorts image but no paint smear. Crisp and subtle.

---

**Recommended starting point:** Option B (smaller change, lower risk, still achieves "no black bleed" goal). Option A is more dramatic but requires passing velocity to display shader.

---

## CORE/FEATURE: Add background image to canvas

**Status:** ⚠️ NEEDS USER CONFIRMATION — API shape decided (use `backgroundSrc` prop), implementation details TBD.
**Effort:** M–L

User wants `<FluidText text="hello" backgroundSrc="/bg.jpg" />` — image visible behind text through the fluid. Also applicable to `FluidImage` (second background layer).

**Confirmed API:** `backgroundSrc?: string` prop on both `FluidText` and `FluidImage`. Optional `backgroundSize?: string` (default `'cover'`) for fit.

**Current arch:** `uBackground` uniform = text/image texture. No second layer concept exists.

**Possible approach:**
- Load `backgroundSrc` as a separate bitmap.
- In `createTextTextures` / `createImageTextures`: composite the background image into the background canvas before drawing text/image on top.
- No shader change needed — the background texture already supports arbitrary content.

**Needs design confirmation before implementation.**
