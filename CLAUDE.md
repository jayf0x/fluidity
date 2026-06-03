# fluidity-js — Project Guide for Claude Agents

## What this is

WebGPU-first fluid simulation React library (falls back to WebGL2 → WebGL1). Navier-Stokes solver (advection, divergence, pressure, vorticity). Two render targets: text (draws text on canvas, uses as obstacle+background) and image (loads bitmap, same). Runs in Web Worker via OffscreenCanvas by default.

## Repo layout

```
fluidity/
├── src/                     # Library source (.ts/.tsx — fully typed)
│   ├── index.ts             # Exports
│   ├── globals.d.ts         # Ambient global types (FluidConfig, FluidHandle, FluidBaseProps, etc.) — no import needed
│   ├── index.d.ts           # Public module declarations for consumers (re-exports globals.d.ts)
│   ├── core/
│   │   ├── config.ts        # DEFAULT_CONFIG, DEFAULT_CONFIG_TEXT, DEFAULT_PROPS_*, DEFAULT_QUALITY, PRESETS, PROP_RANGES, mergeConfig, normalizeConfig
│   │   ├── gl-utils.ts      # initGLContext, initWebGPU, initRenderer, Program class, createFBO, createDoubleFBO, createBlit
│   │   ├── gpu-utils.ts     # WebGPU helpers: createGPUPrograms, createGPUDoubleFBO, uniform writers, gpuRenderToTexture
│   │   ├── shaders.ts       # All GLSL shader strings (WebGL path)
│   │   ├── wgsl-shaders.ts  # All WGSL shader strings (WebGPU path)
│   │   ├── simulation.ts    # FluidSimulation class — dual WebGPU/WebGL paths; use FluidSimulation.create() for WebGPU-first
│   │   └── textures.ts      # createTextTextures, createImageTextures (GL); createTextTexturesGPU, createImageTexturesGPU; loadImageBitmap
│   ├── worker/index.ts      # Web Worker: receives messages, delegates to FluidSimulation
│   ├── fluid-controller.ts  # FluidController: worker vs main-thread abstraction
│   └── react/
│       ├── FluidText.tsx    # React component (forwardRef)
│       ├── FluidImage.tsx   # React component (forwardRef), imageSize prop
│       └── useFluid.ts      # Hook: creates canvas programmatically, mounts FluidController
├── tests/                   # Vitest + jsdom tests (83 total)
│   ├── setup.js             # WebGL mock, canvas mock, Worker/OffscreenCanvas shims; navigator.gpu absent → all tests on WebGL path
│   ├── core/
│   │   ├── simulation.test.js
│   │   ├── config.test.js
│   │   └── gl-utils.test.js
│   ├── fluid-controller.test.js
│   ├── exports.test.js
│   └── react/
├── demo/                    # Demo site (NOT published, uses vite alias to src/)
│   ├── src/
│   │   ├── App.tsx          # Nav + example switcher (5 tabs)
│   │   ├── examples/        # TextExample, ImageExample, SplashExample, SplitExample, PresetsExample
│   │   ├── hooks/useFluidControls.ts  # Shared Leva controls hook — defines canonical slider ranges
│   │   └── components/DemoWrapper.tsx  # Leva panel + layout wrapper
│   ├── vite.config.ts       # base: './', alias fluidity-js → ../src/index.ts
│   └── package.json         # leva, gh-pages
├── vite.config.js           # Library build (Vite 4, Node 16 compat), entry: src/index.ts
├── package.json             # Library package
└── backlog.md               # Prioritized bug/feature backlog
```

## Node version

- **Library** (`/`): Node 16+ deps (vite@4, vitest@0.34).
- **Demo** (`/demo`): Node 20 required (Vite 5).
- macOS nvm: prefix demo commands with `PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH`

## Key commands

A special command `bun test:claude` is added for you to run tests ("test:claude": "PATH=~/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run 2>&1 | tail -8",).

> **Only runs tests if you changed actual logic** (not just a comment or markdown files).

```bash
# Library root
bun test:claude  # run tests
bun build        # build library → dist/

# Demo (from /demo, Node 20)
bun dev
bun build
bun deploy       # gh-pages branch → https://jayf0x.github.io/fluidity
```

## Public API (FluidHandle ref)

```ts
interface FluidHandle {
  reset(): void;
  move(x: number, y: number, strength?: number): void;
  splat(x: number, y: number, velocityX: number, velocityY: number, strength?: number): void;
  updateConfig(config: Partial<FluidConfig>): void;
}
```

`splat()` writes directly to velocity+density FBOs. Safe N×/frame. Use for programmatic paths (attractors, particles). `move` goes through mouse-state machine (one splat per sim step, last-write-wins).

`FluidHandle` is a plain interface (no `extends Element`). `useImperativeHandle` returns the 4 methods above; extending a DOM type would make the factory un-satisfiable.

## Component prop architecture

All `FluidConfig` fields are flat optional props on both components — no nested `config` object. `FluidBaseProps extends Partial<FluidConfig>` to avoid duplicate field declarations in the type.

Quality (`pixelRatio`, `simResolution`) and booleans (`mouseEnabled`, `workerEnabled`, `webGPUEnabled`, `alphaEnabled`) are also flat top-level props.

Components assemble a `configProps` object from non-undefined flat props via `Object.fromEntries` + filter, then call `mergeConfig(configProps, preset, base)`. `configKey = JSON.stringify(configProps)` is the effect dep for reactive config sync.

The `useFluid` hook accepts `pixelRatio` / `simResolution` and maps them to the internal `FluidQuality = { dpr, sim }` at the `FluidController` boundary. `FluidQuality` is kept as an internal type for controller/simulation APIs — not exposed in component props.

## Config (DEFAULT_CONFIG)

Raw shader/simulation values used as the default base (applied when a prop is not set):

```ts
{
  densityDissipation: 0.992, velocityDissipation: 0.93, pressureIterations: 1,
  curl: 0.0001, splatRadius: 0.004, splatForce: 0.91,
  refraction: 0.25, specularExp: 1.01, shine: 0.01,
  waterColor: '#000000', glowColor: '#b3d9ff',
  algorithm: 'standard',   // 'standard'|'glass'|'ink'|'aurora'|'ripple'
  warpStrength: 0.015,
}
```

`DEFAULT_CONFIG_TEXT` — FluidText-specific simulation defaults (higher pressure, curl, splatForce etc.) used as the base config in `FluidText` instead of `DEFAULT_CONFIG`.

## Component defaults (config.ts)

```ts
DEFAULT_QUALITY = { dpr: 1, sim: 0.5 };   // internal only — maps to pixelRatio/simResolution props

DEFAULT_PROPS_SHARED = {
  backgroundColor: '#0a0a0a',
  backgroundSize: 'cover',
  mouseEnabled: true,
  workerEnabled: true,
};
DEFAULT_PROPS_IMAGE = { ...DEFAULT_PROPS_SHARED, effect: 0, imageSize: 'cover' };
DEFAULT_PROPS_TEXT = {
  ...DEFAULT_PROPS_SHARED,
  fontSize: 100,
  color: '#ffffff',
  fontFamily: 'sans-serif',
  fontWeight: 900,
};
```

`DEFAULT_QUALITY` is used internally in components as the default for `pixelRatio` / `simResolution` props (`dpr: 1` → `pixelRatio` default, `sim: 0.5` → `simResolution` default).

## Simulation pipeline (per frame, simulation.ts #step)

1. Advect velocity (obstacle mask zeroes inside text/image)
2. Advect density
3. Curl → vorticity confinement
4. Splat — mouse move OR direct `splat()` calls → velocity + density FBOs
5. Divergence → pressure solve (N iterations) → gradient subtract
6. Display pass: 5 texture units bound:
   - `uTexture(0)` = density FBO
   - `uObstacle(1)` = obstacle tex
   - `uBackground(2)` = background tex
   - `uCoverage(3)` = binary content mask (enables transparent canvas)
   - `uVelocity(4)` = velocity FBO (used by aurora algorithm)
   - Uniforms: `uAlgorithm` (int 0–4), `uWarpStrength`, `uWaterColor`, `uGlowColor`, `uRefraction`, `uSpecularExp`, `uShine`

## Critical architecture decisions

### React StrictMode + OffscreenCanvas

`transferControlToOffscreen` irreversible. StrictMode double-mounts → double transfer → crash.
**Fix:** `useFluid.ts` creates fresh `<canvas>` element per mount inside container `<div>`, removes on cleanup. `FluidController` also has try/catch fallback to main-thread mode.

### Worker destroy timing

```ts
destroy() {
  const worker = this.#worker;
  this.#worker = null;                          // null first — prevents double-use
  worker.postMessage({ type: 'destroy' });
  setTimeout(() => worker.terminate(), 50);     // captured ref safe
}
```

### createBlit optimization

Vertex buffer + attrib pointer set up ONCE in `createBlit(gl)`. Returns `blit(fbo)` fn — only binds FBO + draws. Never call `vertexAttribPointer` per draw.

### Transparent canvas

WebGL context: `alpha: true`. `gl.clearColor(0,0,0,0)`. Display shader outputs premultiplied alpha: `vec4(color * alpha, alpha)`. Coverage texture (`uCoverage`) = binary mask of content area → empty space transparent → CSS `backgroundColor` prop visible through canvas.

- Text mode: `coverageTex === obstacleTex` (same ref, guard double-delete in `#disposeTextures`)
- Image mode: separate white-rect coverage texture

**Background colour contamination fix (shaders.ts):** In non-coverage areas the `uBackground` texture is empty black canvas. All background samples are masked by coverage: `mix(uWaterColor, texture2D(uBackground, uv).rgb, coverage)`. This means fluid in transparent areas uses `uWaterColor` as its base instead of black, so the CSS `backgroundColor` bleeds through correctly regardless of `waterColor` or algorithm.

### DPR-aware canvas sizing

All canvas sizing is DPR-aware. `useFluid` multiplies `clientWidth/clientHeight` by `window.devicePixelRatio * clampedDprRef.current` (clamped `pixelRatio` prop) when setting initial canvas dimensions. The ResizeObserver reads `clampedDprRef` (a ref, not a closure) so it always uses the current pixelRatio. `FluidController.#initWorker` computes `width = clientWidth * effectiveDpr` before transferring the canvas. The simulation stores `#dpr` (set from `window.devicePixelRatio` or passed via the `resize(w, h, dpr)` call for the worker path). Mouse/splat coordinates (CSS pixels) are multiplied by `#dpr` before normalising to [0,1] UV space so cursor alignment is correct on HiDPI screens.

### Preset reactivity

`FluidText` and `FluidImage` have a `useEffect([preset, configKey])` that calls `updateConfig(mergeConfig(configProps, preset))` whenever any flat config prop or preset changes. `configKey` is `JSON.stringify` of the assembled `configProps` object (flat props filtered to non-undefined). On components with no config props the effect fires once on mount with base defaults.

### Quality reactivity

`useFluid` has a `useEffect([pixelRatio, simResolution])` that propagates quality changes after mount. It:
1. Updates `clampedDprRef.current` so future ResizeObserver callbacks use the new pixelRatio.
2. Calls `controller.updateQuality({ dpr: pixelRatio, sim: simResolution })` — updates `#qualityDpr` / `#qualitySim` in the controller and posts an `updateQuality` message to the worker (or updates the sim directly on main thread).
3. Calls `controller.resize(w * newDpr, h * newDpr)` to resize the canvas and rebuild FBOs with the new `simScale`.

The effect compares against `prevQualityRef` to skip on first mount and to avoid redundant resizes when values are unchanged. `useFluid` accepts `pixelRatio` and `simResolution` as flat params; maps to internal `FluidQuality = { dpr, sim }` at the controller boundary.

Worker message: `updateQuality { quality: { dpr, sim } }` — worker calls `sim.updateQuality(quality)` which updates `#qualityDpr` and `#simScale`. FBO rebuild happens on the subsequent `resize` message.

### backgroundSrc bitmap lifecycle

Main thread: loads bitmap via `loadImageBitmap()`, transfers to worker (zero-copy `postMessage([bitmap])`). Worker stores in `#backgroundBitmap`. On change: old bitmap `.close()`d in `setBackground()`. On destroy: `.close()` called.

## Import style

All `src/**` imports use no file extension (e.g. `from './config'` not `from './config.js'`). `moduleResolution: "bundler"` in tsconfig resolves without extensions. Exception: the worker Vite import keeps its extension because the query string must be adjacent to the path: `'./worker/index.js?worker&inline'`.

## Tests

83 tests. All must pass before committing. Run with `bun test:claude` (see Key commands).

- `tests/setup.js` — WebGL mock (`createWebGLMock`), canvas mock (`createCanvasMock`). Mock includes `clearColor`, `clear`, `COLOR_BUFFER_BIT`, `TEXTURE0`–`TEXTURE4`.
- React component mocks: `vi.mock('../../src/fluid-controller.ts', ...)` — note `.ts` extension required.
- Worker mock: `vi.mock('../src/worker/index.ts?worker&inline', ...)`
- `FluidText`/`FluidImage` are forwardRef ExoticComponents — check `$$typeof`, not `typeof`.
- `tests/core/simulation.test.js` — simulation lifecycle: destroy-during-fetch, resize-triggers-loop, URL handling.
