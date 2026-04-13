# fluidity-js — Project Guide for Claude Agents

## What this is
WebGL fluid simulation React library. Navier-Stokes solver (advection, divergence, pressure, vorticity). Two render targets: text (draws text on canvas, uses as obstacle+background) and image (loads bitmap, same). Runs in Web Worker via OffscreenCanvas by default.

## Repo layout
```
fluidity/
├── src/                     # Library source (published as fluidity-js)
│   ├── index.js             # Exports
│   ├── core/
│   │   ├── config.js        # DEFAULT_CONFIG + mergeConfig
│   │   ├── gl-utils.js      # initWebGL, Program class, createFBO, createDoubleFBO, createBlit
│   │   ├── shaders.js       # All GLSL shader strings
│   │   ├── simulation.js    # FluidSimulation class (main simulation loop)
│   │   └── textures.js      # createTextTextures, createImageTextures, loadImageBitmap, computeImageTransform
│   ├── worker/index.js      # Web Worker: receives messages, delegates to FluidSimulation
│   ├── fluid-controller.js  # FluidController: worker vs main-thread abstraction
│   └── react/
│       ├── FluidText.jsx    # React component (forwardRef)
│       ├── FluidImage.jsx   # React component (forwardRef), imageSize prop
│       └── useFluid.js      # Hook: creates canvas programmatically, mounts FluidController
├── types/index.d.ts         # TypeScript declarations
├── tests/                   # Vitest + jsdom tests (65 total)
│   ├── setup.js             # WebGL mock, canvas mock, Worker/OffscreenCanvas shims
│   ├── core/
│   ├── fluid-controller.test.js
│   ├── exports.test.js
│   └── react/
├── demo/                    # Demo site (NOT published, uses vite alias to src/)
│   ├── src/
│   │   ├── App.tsx          # Nav + example switcher (5 tabs)
│   │   ├── examples/        # TextExample, ImageExample, SplashExample, SplitExample, PresetsExample
│   │   └── components/Panel.tsx  # Floating panel UI primitives
│   ├── vite.config.ts       # base: './', alias fluidity-js → ../src/index.js
│   └── package.json         # leva installed, gh-pages for deploy
├── vite.config.js           # Library build (Vite 4, Node 16 compat)
├── package.json             # Library package
└── backlog.md               # Prioritized feature/bug backlog
```

## Node version
- **Library** (`/`): Node 16 compatible deps (vite@4, vitest@0.34). Run tests/build with Node 16+.
- **Demo** (`/demo`): Node 20 required. Vite 5.
- On macOS with nvm: prefix demo commands with `PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH`

## Key commands
```bash
# Library
npm test                          # watch mode
npx vitest run                    # single run
PATH=.../node/v20.19.6/bin:$PATH npx vitest run  # safe version

# Demo (cd demo first)
pnpm dev                          # dev server
pnpm build                        # production build to demo/dist/
pnpm deploy                       # build + push to gh-pages branch
```

## Critical architecture decisions

### React StrictMode + OffscreenCanvas
`transferControlToOffscreen` is irreversible. StrictMode double-mounts would try to transfer twice → crash.
**Fix**: `useFluid.js` creates a fresh `<canvas>` element programmatically each mount inside a container `<div>`, removes on cleanup. Components render `<div>` not `<canvas>`. `FluidController` also has try/catch fallback.

```js
// useFluid.js — core pattern
useEffect(() => {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const controller = new FluidController(canvas, opts);
  const ro = new ResizeObserver(([e]) => {
    const { inlineSize: w, blockSize: h } = e.contentBoxSize[0];
    controller.resize(Math.round(w), Math.round(h));
  });
  ro.observe(container);
  return () => { ro.disconnect(); controller.destroy(); canvas.remove(); };
}, []);
```

### Worker destroy timing
```js
// fluid-controller.js — capture ref before nulling
destroy() {
  const worker = this.#worker;
  this.#worker = null;           // null first
  worker.postMessage({ type: 'destroy' });
  setTimeout(() => worker.terminate(), 50);  // captured ref, not this.#worker
}
```

### createBlit optimization
Vertex buffer + attrib pointer set up ONCE in `createBlit(gl)`. Returns `blit(fbo)` fn that only binds FBO + draws. Do NOT call `vertexAttribPointer` per draw.

### Image size (computeImageTransform)
In `textures.js`. Accepts `'cover'|'contain'|'50%'|'200px'|number`. Default `'cover'`. Propagated:
`FluidImage imageSize prop` → `controllerRef.setImageSource(src, effect, size)` → `FluidController.setImageSource` → worker msg `{type:'setImageSource', src, effect, size}` → `FluidSimulation.setImageSource(src, effect, size)` → `createImageTextures(..., size)`.

## Simulation pipeline (per frame)
1. Advect velocity (obstacle mask zeroes inside text/image)
2. Advect density
3. Curl → vorticity confinement
4. Splat (mouse move → velocity + density FBOs)
5. Divergence → pressure solve (N iterations) → gradient subtract
6. Display: sample density FBO → compute normals → refract background texture → add specular

## Shader uniforms (display)
`uTexture`=density FBO, `uObstacle`=obstacle tex, `uBackground`=background tex, `uWaterColor`, `uGlowColor`, `uRefraction`, `uSpecularExp`, `uShine`, `texelSize`.

## Config (DEFAULT_CONFIG)
```js
{ densityDissipation: 0.992, velocityDissipation: 0.93, pressureIterations: 25,
  curl: 0.0001, splatRadius: 0.004, splatForce: 0.91,
  refraction: 0.25, specularExp: 1.01, shine: 0.01,
  waterColor: [0,0,0], glowColor: [0.7,0.85,1.0] }
```

## Tests
65 tests. All must pass before committing. Run: `PATH=.../v20.19.6/bin:$PATH npx vitest run`

Tests use full WebGL mock in `tests/setup.js`. `FluidText`/`FluidImage` are `forwardRef` ExoticComponents — check `$typeof` not `typeof === 'function'`.

## Known issues (see backlog.md for implementation details)

### Image effect (CORE/BUG)
Current: white fluid appears on top of image, reveals black background when pushed. Wrong.
Desired: UV warp rendering — use velocity field to distort UV when sampling `uBackground`. No separate fluid color. See backlog.md for full implementation plan.

### Text flicker (CORE/BUG)
Density FBO holds slightly negative values near obstacle boundary → display shader produces dark flash.
Fix: `float density = max(texture2D(uTexture, vUv).r, 0.0);` in displayShader.

### Image whitespace not interactive (CORE/BUG)
With small imageSize (e.g. `10%`), surrounding black area fluid is invisible because `waterColor=[0,0,0]`.
Fix: add `backgroundColor` CSS prop to `FluidImage` container div (default `#0a0a0a`).

## Demo site
5 examples: text, image, auto-splash, split-view (worker=false), presets.
Nav: pill tabs top-center. Controls: floating `Panel` component bottom-left.
GitHub Pages: `base: './'` in vite config, `pnpm deploy` (gh-pages).
URL: https://jayf0x.github.io/fluidity

## Leva (demo controls)
Already installed in `demo/package.json`. Backlog item wants all examples to use `useControls` from Leva. Hook to create: `demo/src/hooks/useFluidControls.ts` — shared DEFAULT_CONFIG sliders + page-specific folder.

## Type system
`types/index.d.ts` — `FluidConfig`, `FluidHandle`, `FluidTextProps`, `FluidImageProps` (has `imageSize?: string | number`), `FluidBaseProps`, `useFluid`, `FluidController`, `FluidSimulation`.
`demo/tsconfig.json` paths: `"fluidity-js"` → `["../types/index.d.ts"]`.
