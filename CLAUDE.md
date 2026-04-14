# fluidity-js — Project Guide for Claude Agents

## What this is
WebGL fluid simulation React library. Navier-Stokes solver (advection, divergence, pressure, vorticity). Two render targets: text (draws text on canvas, uses as obstacle+background) and image (loads bitmap, same). Runs in Web Worker via OffscreenCanvas by default.

## Repo layout
```
fluidity/
├── src/                     # Library source (.ts/.tsx — fully typed)
│   ├── index.ts             # Exports
│   ├── core/
│   │   ├── config.ts        # DEFAULT_CONFIG + mergeConfig
│   │   ├── gl-utils.ts      # initWebGL, Program class, createFBO, createDoubleFBO, createBlit
│   │   ├── shaders.ts       # All GLSL shader strings
│   │   ├── simulation.ts    # FluidSimulation class (main simulation loop)
│   │   └── textures.ts      # createTextTextures, createImageTextures, loadImageBitmap, computeImageTransform
│   ├── worker/index.ts      # Web Worker: receives messages, delegates to FluidSimulation
│   ├── fluid-controller.ts  # FluidController: worker vs main-thread abstraction
│   └── react/
│       ├── FluidText.tsx    # React component (forwardRef)
│       ├── FluidImage.tsx   # React component (forwardRef), imageSize prop
│       └── useFluid.ts      # Hook: creates canvas programmatically, mounts FluidController
├── types/index.d.ts         # Manual TypeScript declarations (public API)
├── tests/                   # Vitest + jsdom tests (68 total)
│   ├── setup.js             # WebGL mock, canvas mock, Worker/OffscreenCanvas shims
│   ├── core/
│   ├── fluid-controller.test.js
│   ├── exports.test.js
│   └── react/
├── demo/                    # Demo site (NOT published, uses vite alias to src/)
│   ├── src/
│   │   ├── App.tsx          # Nav + example switcher (5 tabs)
│   │   ├── examples/        # TextExample, ImageExample, SplashExample, SplitExample, PresetsExample
│   │   ├── hooks/useFluidControls.ts  # Shared Leva controls hook
│   │   └── components/ExampleWrapper.tsx  # Leva panel + layout wrapper
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
```bash
# Library tests
PATH=~/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run

# Demo (from /demo)
pnpm dev
pnpm build
pnpm deploy   # gh-pages branch → https://jayf0x.github.io/fluidity
```

## Public API (FluidHandle ref)
```ts
interface FluidHandle {
  reset(): void
  updateLocation(opts: { x: number; y: number; strength?: number }): void
  splat(x: number, y: number, vx: number, vy: number, strength?: number): void
  updateConfig(config: Partial<FluidConfig>): void
}
```
`splat()` writes directly to velocity+density FBOs. Safe N×/frame. Use for programmatic paths (attractors, particles). `updateLocation` goes through mouse-state machine (one splat per sim step, last-write-wins).

## Config (DEFAULT_CONFIG)
```ts
{
  densityDissipation: 0.992, velocityDissipation: 0.93, pressureIterations: 25,
  curl: 0.3, splatRadius: 0.004, splatForce: 0.91,
  refraction: 0.25, specularExp: 1.01, shine: 0.01,
  waterColor: [0,0,0], glowColor: [0.7,0.85,1.0],
  algorithm: 'standard',   // 'standard'|'glass'|'ink'|'aurora'|'ripple'
  warpStrength: 0.015,
}
```

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

### backgroundSrc bitmap lifecycle
Main thread: loads bitmap via `loadImageBitmap()`, transfers to worker (zero-copy `postMessage([bitmap])`). Worker stores in `#backgroundBitmap`. On change: old bitmap `.close()`d in `setBackground()`. On destroy: `.close()` called.

## Tests
68 tests. All must pass before committing.
- `tests/setup.js` — WebGL mock (`createWebGLMock`), canvas mock (`createCanvasMock`). Mock includes `clearColor`, `clear`, `COLOR_BUFFER_BIT`, `TEXTURE0`–`TEXTURE4`.
- React component mocks: `vi.mock('../../src/fluid-controller.ts', ...)` — note `.ts` extension required.
- Worker mock: `vi.mock('../src/worker/index.ts?worker&inline', ...)`
- `FluidText`/`FluidImage` are forwardRef ExoticComponents — check `$$typeof`, not `typeof`.
