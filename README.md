# fluidity-js — WebGPU Fluid Simulation for React

[![npm version](https://img.shields.io/npm/v/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![npm downloads](https://img.shields.io/npm/dm/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@jayf0x/fluidity-js)](https://bundlephobia.com/package/@jayf0x/fluidity-js)
[![license](https://img.shields.io/npm/l/@jayf0x/fluidity-js)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./tsconfig.json)
[![CI](https://github.com/jayf0x/fluidity/actions/workflows/ci.yml/badge.svg)](https://github.com/jayf0x/fluidity/actions/workflows/ci.yml)

**Real-time Navier-Stokes fluid dynamics for React — interactive water, ink, glass, and aurora effects on text and images. WebGPU-first with automatic WebGL2/WebGL1 fallback. Runs in a Web Worker for zero jank.**

<a href="https://jayf0x.github.io/fluidity">
  <p align="center">
    <img src="assets/preview.gif" alt="WebGPU fluid simulation — fluid text and image effects in React" height="300px"/>
  </p>
  <p align="center"><strong>Live demo →</strong></p>
</a>

```bash
npm install @jayf0x/fluidity-js
# bun add / yarn add / pnpm add
```

> **WebGPU-first** — falls back automatically to WebGL2 → WebGL1. No configuration required.

---

## Features

- **Fluid text effects** — wrap fluid around text as obstacle + background
- **Fluid image effects** — apply fluid over any bitmap with `cover`/`contain` sizing
- **5 visual algorithms** — standard, glass, ink, aurora, ripple
- **5 presets** — calm, sand, wave, neon, smoke
- **Web Worker** — simulation runs off the main thread via OffscreenCanvas
- **WebGPU + WebGL2 + WebGL1** — widest browser compatibility
- **Fully typed** — ambient TypeScript types, no import needed
- **React 17+** — forwardRef components, StrictMode safe
- **Programmatic API** — `splat()`, `move()`, `updateConfig()`, `reset()`
- **Reactive props** — change algorithm, preset, quality, config at runtime

---

## Quickstart

```tsx
import { FluidText, FluidImage } from '@jayf0x/fluidity-js';

// Fluid text — reacts to cursor movement
export function Hero() {
  return (
    <div style={{ width: '100%', height: 400 }}>
      <FluidText text="Hello World" fontSize={140} color="#ffffff" />
    </div>
  );
}

// Full-bleed fluid image
export function Cover() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FluidImage src="/hero.jpg" algorithm="aurora" />
    </div>
  );
}
```

**Presets and algorithms:**

```tsx
<FluidText text="Wicked" preset="neon" algorithm="glass" />
<FluidImage src="/poster.jpg" algorithm="ripple" config={{ curl: 0.4, splatRadius: 0.008 }} />
<FluidText text="Chill" preset="calm" quality={{ dpr: 1, sim: 0.75 }} />
```

---

## Programmatic control

Use `ref` to trigger effects from code — attractors, scroll-driven splats, click bursts:

```tsx
import { useRef } from 'react';
import { FluidText } from '@jayf0x/fluidity-js';

export function Interactive() {
  const fluid = useRef<FluidHandle>(null);

  return (
    <>
      <div style={{ width: '100%', height: 400 }}>
        <FluidText ref={fluid} text="Touch me" fontSize={120} color="#fff" />
      </div>
      <button onClick={() => fluid.current?.splat(200, 200, 8, -4)}>Splat</button>
      <button onClick={() => fluid.current?.updateConfig({ curl: 0.5 })}>Swirl</button>
      <button onClick={() => fluid.current?.reset()}>Reset</button>
    </>
  );
}
```

### FluidHandle methods

| Method | Description |
|--------|-------------|
| `reset()` | Re-initialise simulation and reload source |
| `updateConfig(patch)` | Merge a partial config update into the running sim |
| `move({ x, y, strength? })` | Programmatic pointer input (canvas-relative px) |
| `splat(x, y, vx, vy, strength?)` | Inject a fluid splat directly — safe to call N×/frame |

---

## Props

### FluidText

| Prop | Type | Default |
|------|------|---------|
| `text` | `string` | — |
| `fontSize` | `number` | `100` |
| `color` | `string` | `'#ffffff'` |
| `fontFamily` | `string` | `'sans-serif'` |
| `fontWeight` | `string \| number` | `900` |

### FluidImage

| Prop | Type | Default |
|------|------|---------|
| `src` | `string` | — |
| `imageSize` | `string \| number` | `'cover'` |
| `effect` | `number` | `0` |

### Shared props

| Prop | Type | Default |
|------|------|---------|
| `config` | `Partial<FluidConfig>` | — |
| `preset` | `PresetKey` | — |
| `algorithm` | `FluidAlgorithm` | `'standard'` |
| `quality` | `FluidQuality` | `{ dpr: 1, sim: 0.5 }` |
| `backgroundColor` | `string` | `'#0a0a0a'` |
| `backgroundSrc` | `string` | — |
| `backgroundSize` | `string \| number` | `'cover'` |
| `isMouseEnabled` | `boolean` | `true` |
| `isWorkerEnabled` | `boolean` | `true` |
| `useWebGPU` | `boolean` | `true` |
| `className` | `string` | — |
| `style` | `CSSProperties` | — |

---

## Algorithms

| Value | Character |
|-------|-----------|
| `'standard'` | Colour overlay + gentle refraction (default) |
| `'glass'` | UV distortion only — bent-glass, no colour |
| `'ink'` | Dense opaque pigment that accumulates and stains |
| `'aurora'` | Velocity-field UV warp — liquid metal / lava-lamp |
| `'ripple'` | Exaggerated normals + Fresnel rim — still water |

```tsx
<FluidImage src="/photo.jpg" algorithm="aurora" />
<FluidText text="fluid" algorithm="ripple" config={{ warpStrength: 0.03 }} />
```

---

## Presets

```tsx
<FluidText text="Wicked" preset="neon" />
<FluidText text="Calm vibes" preset="calm" />
```

Available: `calm` · `sand` · `wave` · `neon` · `smoke`

Presets are reactive — changing the prop at runtime re-applies the config. Any `config` values you pass override the preset. The `algorithm` prop also overrides the preset's algorithm.

---

## Quality

`quality` controls rendering resolution on two independent axes. Both are reactive at runtime.

| Field | Range | Default | Description |
|-------|-------|---------|-------------|
| `dpr` | 0.1–1 | `1` | Canvas backing resolution as fraction of `devicePixelRatio`. `0.5` on Retina saves ~75% fill rate. |
| `sim` | 0.1–1 | `0.5` | Simulation FBO size as fraction of canvas size. Lower = cheaper GPU, less fluid detail. |

```tsx
// Sharp canvas, cheap simulation
<FluidImage src="/hero.jpg" quality={{ dpr: 1, sim: 0.2 }} />

// Lower canvas res, full simulation quality
<FluidImage src="/hero.jpg" quality={{ dpr: 0.5, sim: 1 }} />
```

---

## FluidConfig reference

| Key | Default | Description |
|-----|---------|-------------|
| `densityDissipation` | `0.992` | How long ink lingers (0–1) |
| `velocityDissipation` | `0.93` | How fast velocity decays (0–1) |
| `pressureIterations` | `1` | Jacobi iterations — accuracy vs. cost |
| `curl` | `0.0001` | Vorticity / swirl. `0.2`–`0.5` for visible eddies |
| `splatRadius` | `0.004` | Brush radius |
| `splatForce` | `0.91` | Force applied by brush |
| `refraction` | `0.25` | Background warp strength |
| `specularExp` | `1.01` | Specular highlight sharpness |
| `shine` | `0.01` | Highlight intensity |
| `waterColor` | `[0, 0, 0]` | Base fluid colour `[R, G, B]` (0–1) |
| `glowColor` | `[0.7, 0.85, 1.0]` | Glow / specular colour `[R, G, B]` (0–1) |
| `warpStrength` | `0.015` | UV warp intensity (`aurora` algorithm) |

---

## TypeScript

All types are globally ambient — no import required:

```ts
// Available globally after installing the package:
// FluidConfig, FluidHandle, FluidAlgorithm, FluidQuality, PresetKey
```

---

## How it works

fluidity-js runs a real-time **Navier-Stokes fluid simulation** entirely on the GPU:

1. **Advect velocity** — move velocity field along itself; obstacle mask zeroes inside text/image
2. **Advect density** — move ink/colour field with velocity
3. **Curl → vorticity confinement** — preserve swirling detail
4. **Splat** — inject velocity + density at cursor or programmatic positions
5. **Divergence → pressure solve** — N Jacobi iterations for incompressibility
6. **Gradient subtract** — enforce divergence-free velocity
7. **Display pass** — 5 texture units: density, obstacle, background, coverage mask, velocity; 5 algorithms selectable by uniform

The simulation runs in a **Web Worker** by default, communicating with the React component via `postMessage`. The canvas is transferred to the worker via `OffscreenCanvas.transferControlToOffscreen()` for true off-thread rendering.

**WebGPU path** uses render pipelines via `@webgpu/types`. **WebGL path** uses double-framebuffer objects (ping-pong FBOs) with GLSL shaders.

---

## Browser support

| Browser | WebGPU | WebGL2 | WebGL1 |
|---------|--------|--------|--------|
| Chrome 113+ | ✅ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ | ✅ |
| Firefox | — | ✅ | ✅ |
| Safari 17+ | ✅ (partial) | ✅ | ✅ |
| Safari < 17 | — | ✅ | ✅ |
| Mobile Chrome | — | ✅ | ✅ |

Fallback is automatic — no configuration needed.

---

## Examples

Full working examples live in [`demo/src/examples/`](./demo/src/examples/):

- `TextExample.tsx` — FluidText with Leva controls
- `ImageExample.tsx` — FluidImage with backgroundSrc
- `SplashExample.tsx` — full-page fluid hero
- `SplitExample.tsx` — split-screen comparison
- `PresetsExample.tsx` — all presets side by side

[**Open live demo →**](https://jayf0x.github.io/fluidity)

---

## Contributing

Issues and PRs welcome. See [AGENTS.md](./AGENTS.md) for agent-specific instructions and code conventions.

1. Fork → branch → PR against `main`
2. Run `bun test:claude` before pushing — all 83 tests must pass
3. No new dependencies without discussion

---

## License

[MIT](./LICENSE) © [jayf0x](https://github.com/jayf0x)
