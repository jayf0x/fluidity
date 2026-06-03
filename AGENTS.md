# AGENTS.md — fluidity-js

> Universal agent instructions for GitHub Copilot, Cursor, GPT-4, Gemini, and all AI coding assistants.
> Claude Code users: see [CLAUDE.md](./CLAUDE.md) for deeper architecture notes.

---

## What this repo is

`@jayf0x/fluidity-js` — a WebGPU-first fluid simulation library for React. Implements a real-time Navier-Stokes solver (advection, divergence, pressure, vorticity confinement) that renders onto a `<canvas>` element. Falls back automatically to WebGL2 → WebGL1. Runs the heavy simulation loop in a Web Worker via OffscreenCanvas by default.

Two components: `<FluidText>` (text as obstacle/background) and `<FluidImage>` (bitmap as obstacle/background).

**Stack:** TypeScript · React 17+ · Vite 4 · Vitest · Bun

---

## Repo layout (critical paths)

```
src/
  index.ts                  ← public exports
  globals.d.ts              ← ambient global types (FluidConfig, FluidHandle…)
  core/
    config.ts               ← DEFAULT_CONFIG, presets, mergeConfig
    gl-utils.ts             ← WebGL context + FBO helpers
    gpu-utils.ts            ← WebGPU helpers
    shaders.ts              ← GLSL shader strings
    wgsl-shaders.ts         ← WGSL shader strings
    simulation.ts           ← FluidSimulation class (dual WebGPU/WebGL)
    textures.ts             ← texture creation for text + image modes
  worker/index.ts           ← Web Worker message handler
  fluid-controller.ts       ← worker vs main-thread abstraction
  react/
    FluidText.tsx           ← React component
    FluidImage.tsx          ← React component
    useFluid.ts             ← core hook: canvas lifecycle + controller
tests/                      ← Vitest + jsdom (83 tests)
demo/                       ← standalone Vite 5 demo site (NOT the library)
dist/                       ← built output (do not edit)
```

---

## Commands

```bash
# Run tests (library root, Node 16 compat)
bun test:claude             # preferred: runs vitest, tails last 8 lines

# Build library
bun build

# Demo (requires Node 20)
cd demo
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun dev
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun build
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun deploy  # → gh-pages
```

---

## Public API

### Components

```tsx
<FluidText text="Hello" fontSize={120} color="#fff" algorithm="glass" preset="neon" />
<FluidImage src="/hero.jpg" algorithm="aurora" quality={{ dpr: 1, sim: 0.5 }} />
```

### FluidHandle ref

```ts
interface FluidHandle {
  reset(): void;
  move(opts: { x: number; y: number; strength?: number }): void;
  splat(x: number, y: number, vx: number, vy: number, strength?: number): void;
  updateConfig(config: Partial<FluidConfig>): void;
}
```

### Algorithms
`'standard'` · `'glass'` · `'ink'` · `'aurora'` · `'ripple'`

### Presets
`'calm'` · `'sand'` · `'wave'` · `'neon'` · `'smoke'`

---

## Code style / conventions

- **TypeScript strict** — no `any`, no non-null assertions without a comment
- **No file extensions** on imports within `src/` (e.g. `from './config'`)  
  Exception: worker import keeps `.js?worker&inline` for Vite query string
- **No default exports** from library modules; named exports only
- **No comments** unless the *why* is non-obvious (hidden constraint, invariant, workaround)
- **Formatting:** Prettier with `@trivago/prettier-plugin-sort-imports`
- **Tests:** All 83 must pass before any commit. Add tests for new behaviour.

---

## Architecture invariants (do not violate)

| Rule | Reason |
|------|--------|
| `transferControlToOffscreen` called at most once per canvas | Irreversible — double-mount in StrictMode would crash |
| `useFluid` creates a **fresh** `<canvas>` element each mount inside a container `<div>` | StrictMode safety |
| `createBlit` sets up vertex buffers **once** | Performance — never call `vertexAttribPointer` per draw |
| Worker `.terminate()` always deferred 50ms after `postMessage({type:'destroy'})` | Lets the worker flush its destroy sequence |
| Display shader outputs **premultiplied alpha** | Transparent canvas compositing correctness |
| Coverage texture ref: `text` mode → `coverageTex === obstacleTex`; guard against double-delete | Memory safety |

---

## What agents MUST NOT do

- **Do not** edit files under `dist/` — these are build artefacts
- **Do not** add `// eslint-disable` or `@ts-ignore` without explaining why in the PR
- **Do not** introduce new peer dependencies without updating `peerDependencies` in `package.json`
- **Do not** call `vertexAttribPointer` inside the render loop
- **Do not** call `transferControlToOffscreen` more than once per canvas element
- **Do not** use `window.*` APIs directly inside `worker/index.ts` (worker context)
- **Do not** commit if `bun test:claude` fails
- **Do not** change the module format from ESM to CJS — consumers depend on tree-shaking
- **Do not** modify `CLAUDE.md` unless explicitly asked — it is the authoritative agent guide

---

## Testing notes

- Tests run under jsdom with a WebGL mock (`tests/setup.js`). `navigator.gpu` is absent — all tests exercise the WebGL path.
- `FluidText`/`FluidImage` are `forwardRef` ExoticComponents — check `$$typeof`, not `typeof`.
- React component mocks require `.ts` extension: `vi.mock('../../src/fluid-controller.ts', ...)`
- Worker mock: `vi.mock('../src/worker/index.ts?worker&inline', ...)`

---

## Where to find more

| Resource | Path |
|----------|------|
| Deep architecture guide (Claude-specific) | [CLAUDE.md](./CLAUDE.md) |
| Prioritised bug/feature backlog | [backlog.md](./backlog.md) |
| Version history | [changelog.md](./changelog.md) |
| Live demo source | [demo/src/examples/](./demo/src/examples/) |
| npm package | https://www.npmjs.com/package/@jayf0x/fluidity-js |
| Live demo | https://jayf0x.github.io/fluidity |
