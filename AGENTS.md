# fluidity-js — Agent Guide

WebGPU-first fluid simulation React library. Real-time Navier-Stokes solver (advection, divergence, pressure, vorticity confinement) on a `<canvas>`. Automatic fallback: WebGPU → WebGL2 → WebGL1. Simulation runs in a Web Worker via OffscreenCanvas by default.

Two components: `<FluidText>` (text as obstacle/background) and `<FluidImage>` (bitmap as obstacle/background).

**Stack:** TypeScript · React 17+ · Vite 4 · Vitest · Bun

---

## Repo layout

```
src/
  index.ts                  ← public exports
  globals.d.ts              ← ambient global types (FluidConfig, FluidHandle, FluidBaseProps…) — no import needed
  index.d.ts                ← public module declarations for consumers
  core/
    config.ts               ← DEFAULT_CONFIG, DEFAULT_CONFIG_TEXT, DEFAULT_PROPS_*, DEFAULT_QUALITY,
                               PRESETS, PROP_RANGES, mergeConfig, normalizeConfig
    gl-utils.ts             ← WebGL context + FBO helpers, Program class, createBlit
    gpu-utils.ts            ← WebGPU helpers
    shaders.ts              ← GLSL shader strings
    wgsl-shaders.ts         ← WGSL shader strings
    simulation.ts           ← FluidSimulation class (dual WebGPU/WebGL); use FluidSimulation.create() for WebGPU-first
    textures.ts             ← texture creation for text + image modes
  worker/index.ts           ← Web Worker message handler
  fluid-controller.ts       ← worker vs main-thread abstraction
  react/
    FluidText.tsx           ← React component (forwardRef)
    FluidImage.tsx          ← React component (forwardRef), imageSize prop
    useFluid.ts             ← core hook: canvas lifecycle + controller
tests/                      ← Vitest + jsdom
demo/                       ← standalone Vite 5 demo site (NOT the library; uses alias to src/)
dist/                       ← built output (do not edit)
bugs.md                     ← known defects (see Working the backlog) — absent when empty, recreated on the next filed bug
features.md                 ← features + improvements (see Working the backlog)
```

---

## Working the backlog

Two flat lists drive non-urgent work:

- **bugs.md** — known defects. Deleted once the last row is removed — don't assume it exists; create it fresh when filing the first new bug.
- **[features.md](./features.md)** — new capabilities (Features) and enhancements (Improvements).

Rules:

- Pick the top relevant row, build the fix/feature, **add a test**, then **delete that row**. If that empties the file's table, delete the file too.
- A new bug → create/append a one-line row in `bugs.md`; a new feature/improvement → `features.md`. Keep entries short: what + which files. No design essays.
- These files are the source of truth — GitHub Issues are not used for the backlog.

---

## Commands

```bash
# Run tests (library root)
bun test:claude             # preferred: runs vitest, tails last 8 lines

# Build library
bun build                   # → dist/

# Demo (requires Node 20)
cd demo
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun dev
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun build
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun deploy   # → gh-pages
```

**Node version:** library root uses Node 16+ deps (vite@4, vitest@0.34); demo requires Node 20 (Vite 5).

---

## Public API

### Components

```tsx
<FluidText text="Hello" fontSize={120} color="#fff" algorithm="glass" preset="neon" />
<FluidImage src="/hero.jpg" algorithm="aurora" pixelRatio={1} simResolution={0.5} />
```

All `FluidConfig` fields are **flat optional props** on both components — there is no nested `config` object. `FluidBaseProps extends Partial<FluidConfig>` to avoid duplicate field declarations.

### FluidHandle ref

```ts
interface FluidHandle {
  reset(): void;
  move(x: number, y: number, strength?: number): void;
  splat(x: number, y: number, velocityX: number, velocityY: number, strength?: number): void;
  updateConfig(config: Partial<FluidConfig>): void;
}
```

`splat()` writes directly to velocity+density FBOs — safe to call multiple times per frame. `move()` goes through the mouse-state machine (one splat per sim step, last-write-wins).

### Quality props

`pixelRatio` and `simResolution` are flat top-level props (both `number`, range `0.1–1`). `simMaxPixels` (optional `number`, uncapped by default) caps `simWidth × simHeight` after `simResolution` is applied — both sim axes scale down together (aspect ratio preserved) so extreme aspect ratios stay responsive. All three map to internal `FluidQuality = { dpr, sim, maxPixels }` at the controller boundary — `FluidQuality` is an internal type, not a component prop.

### FluidImage-only / FluidText-only props

- `obstacleStrength` (`FluidImage` only, `0–1`, default `0`): image luminance drives the physics obstacle. `0` = image is decorative only (no blocking); `1` = obstacle strength follows the image's own per-pixel brightness.
- `textBlur` (`FluidText` only, `number`, default `1`, clamped `[0, 2]`): edge softness on the glyph draw (colour + obstacle/coverage passes). Fixes the dark AA fringe on solid-colour text; also the only lever that gives `FluidText`'s obstacle mask a real gradient.
- `refraction`/`warpStrength` are **omitted from `FluidTextProps`** (`Omit<FluidBaseProps, 'refraction' | 'warpStrength'>` in `globals.d.ts`) — with a glyph-shaped obstacle/coverage mask, the background reveal these bend collapses back to `uWaterColor` right outside the glyph edge, so they read as broken rather than subtle. Fully supported on `FluidImage`.

### Algorithms
`'standard'` · `'glass'` · `'ink'` · `'aurora'` · `'ripple'`

### Presets
`'calm'` · `'sand'` · `'wave'` · `'neon'` · `'smoke'`

---

## Normalized prop API

Seven simulation props accept a **normalized `0–1` value** instead of raw physics units. `normalizeConfig` (in `src/core/config.ts`) maps them to physics range before the sim receives them. Values outside `[0, 1]` pass through unchanged as raw physics overrides.

Normalized fields: `densityDissipation`, `velocityDissipation`, `splatRadius`, `splatForce`, `specularExp`, `shine`, `warpStrength`.

`DEFAULT_CONFIG` and presets store normalized values; `normalizeConfig` converts them to physics. See `PROP_RANGES` in `src/core/config.ts` for the exact min/max mappings.

---

## Simulation pipeline (per frame, `simulation.ts#step`)

1. Advect velocity (obstacle mask zeroes inside text/image)
2. Advect density
3. Curl → vorticity confinement
4. Splat — mouse move OR direct `splat()` calls → velocity + density FBOs
5. Divergence → pressure solve (N iterations) → gradient subtract — **slip boundary condition**: velocity is decomposed into normal/tangential components via the obstacle mask's local gradient; only the normal component is damped at the boundary (`mix(vel, velTangential, obs)`), so fluid slides along obstacle edges instead of fully stopping (no more flat `* (1.0 - obs)` damp)
6. Pre-blur density (separable Gaussian, 2 passes: horizontal then vertical) into a dedicated FBO — feeds the display pass's Sobel normal only; raw density still drives colour/alpha directly
7. Display pass: 6 texture units bound (`uTexture`, `uObstacle`, `uBackground`, `uCoverage`, `uVelocity`, `uDensityBlurred`); uniforms: `uAlgorithm`, `uWarpStrength`, `uWaterColor`, `uGlowColor`, `uRefraction`, `uSpecularExp`, `uShine`

---

## Architecture invariants (do not violate)

| Rule | Reason |
|------|--------|
| `transferControlToOffscreen` called at most once per canvas | Irreversible — double-mount in React StrictMode crashes |
| `useFluid` creates a **fresh** `<canvas>` each mount inside a container `<div>`, removes on cleanup | StrictMode safety |
| `createBlit` sets up vertex buffers **once** | Performance — never call `vertexAttribPointer` per draw |
| Worker `.terminate()` always deferred 50 ms after `postMessage({type:'destroy'})` | Lets the worker flush its destroy sequence |
| Display shader outputs **premultiplied alpha** (`vec4(color * alpha, alpha)`) | Transparent canvas compositing correctness |
| Text mode: `coverageTex === obstacleTex` (same ref); guard against double-delete in `#disposeTextures` | Memory safety |
| Background colour samples masked by coverage: `mix(uWaterColor, texture2D(uBackground, uv).rgb, coverage)` | Prevents CSS `backgroundColor` contamination in transparent areas |

---

## Critical implementation notes

### React StrictMode + OffscreenCanvas

`transferControlToOffscreen` is irreversible. StrictMode double-mounts → double transfer → crash. Fix: `useFluid.ts` creates a fresh `<canvas>` per mount; `FluidController` has a try/catch fallback to main-thread mode.

### Worker destroy pattern

```ts
destroy() {
  const worker = this.#worker;
  this.#worker = null;                        // null first — prevents double-use
  worker.postMessage({ type: 'destroy' });
  setTimeout(() => worker.terminate(), 50);   // captured ref is safe
}
```

### Transparent canvas

WebGL context: `alpha: true`. `gl.clearColor(0,0,0,0)`. Coverage texture (`uCoverage`) = binary mask of content area → empty space is transparent → CSS `backgroundColor` prop shows through.

- Text mode: `coverageTex === obstacleTex`
- Image mode: separate white-rect coverage texture

### DPR-aware sizing

All canvas sizing multiplies `clientWidth/clientHeight` by `window.devicePixelRatio * clampedDprRef.current`. The ResizeObserver reads a ref (not a closure) so it always uses the current `pixelRatio`. Mouse/splat CSS-pixel coordinates are multiplied by `#dpr` before normalising to UV space.

### Preset + config reactivity

`useEffect([preset, configKey])` calls `updateConfig(mergeConfig(configProps, preset))` whenever any flat config prop or preset changes. `configKey = JSON.stringify(configProps)` is the effect dep.

### Quality reactivity

`useEffect([pixelRatio, simResolution, simMaxPixels])` updates `clampedDprRef`, calls `controller.updateQuality(...)`, then `controller.resize(w * newDpr, h * newDpr)`. Compares against `prevQualityRef` to skip first mount and unchanged values.

### backgroundSrc bitmap lifecycle

Main thread loads bitmap via `loadImageBitmap()`, transfers to worker zero-copy via `postMessage([bitmap])`. Worker stores in `#backgroundBitmap`. Old bitmap `.close()`d on change; `.close()` again on destroy.

---

## Code style

- **TypeScript strict** — no `any`, no non-null assertions without an explanatory comment
- **No file extensions** on imports within `src/` (e.g. `from './config'`)  
  Exception: worker import keeps `.js?worker&inline` (Vite query string must be adjacent to the path)
- **Named exports only** from library modules; no default exports
- **No comments** unless the *why* is non-obvious
- **Formatting:** Prettier with `@trivago/prettier-plugin-sort-imports`

---

## What agents must not do

- Edit files under `dist/` — build artefacts only
- Add `// eslint-disable` or `@ts-ignore` without a comment explaining why
- Introduce new peer dependencies without updating `peerDependencies` in `package.json`
- Call `vertexAttribPointer` inside the render loop
- Call `transferControlToOffscreen` more than once per canvas element
- Use `window.*` APIs inside `worker/index.ts` (worker context has no `window`)
- Commit if `bun test:claude` fails — all tests must pass
- Change the module format from ESM to CJS — consumers depend on tree-shaking
- Import types from `globals.d.ts` — they are globally ambient after install

---

## Testing notes

Tests run under jsdom with a WebGL mock (`tests/setup.js`). `navigator.gpu` is absent — all tests exercise the WebGL path.

- `FluidText`/`FluidImage` are `forwardRef` ExoticComponents — check `$$typeof`, not `typeof`
- React component mocks require `.ts` extension: `vi.mock('../../src/fluid-controller.ts', ...)`
- Worker mock: `vi.mock('../src/worker/index.ts?worker&inline', ...)`
- Run with `bun test:claude`; add tests for any new behaviour

---

## GitHub issue labels

Every issue carries three label groups. Use all three when filing or picking up work.

**`type:*`** — `type:bug` · `type:feature` · `type:improvement` · `type:docs` · `type:refactor`

**`domain:*`** — `domain:core` · `domain:render` · `domain:physics` · `domain:react` · `domain:dx`

**`effort:*`** — `effort:1` (trivial, <30 min) · `effort:2` (few hours) · `effort:3` (half–full day) · `effort:4` (multi-day) · `effort:5` (architectural)

Full label reference: [CONTRIBUTING.md § Labels](./CONTRIBUTING.md#labels)

---

## Where to find more

| Resource | Path / URL |
|----------|------------|
| Simulation config defaults + presets | [src/core/config.ts](./src/core/config.ts) |
| Ambient type declarations | [src/globals.d.ts](./src/globals.d.ts) |
| Known bugs | bugs.md (absent when empty) |
| Feature/improvement backlog | [features.md](./features.md) |
| Version history | [changelog.md](./changelog.md) |
| Demo examples | [demo/src/examples/](./demo/src/examples/) |
| npm | https://www.npmjs.com/package/@jayf0x/fluidity-js |
| Live demo | https://jayf0x.github.io/fluidity |
