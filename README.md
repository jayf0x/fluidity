# fluidity-js - 🔥Upgrade your UX🔥

[![npm](https://img.shields.io/npm/v/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![license](https://img.shields.io/npm/l/@jayf0x/fluidity-js)](./LICENSE)
[![size](https://img.shields.io/bundlephobia/minzip/@jayf0x/fluidity-js)](https://bundlephobia.com/package/@jayf0x/fluidity-js)

 <a href="https://jayf0x.github.io/fluidity">
  <p align="center" title='Try if you can make this effect.'>
      <img align="center" src="assets/preview.gif" alt="preview" height="300px"/>
  </p>

  <p align="center">
    <strong>
    Live demo →
    </strong>
  </p>
</a>

```bash
bun add @jayf0x/fluidity-js
yarn install @jayf0x/fluidity-js
pnpm install @jayf0x/fluidity-js
```

> uses latest `WebGPU` 🔥 With WebGL2 or WebGL1 supported as fallback

---

## React examples

**FluidText:**

```tsx
import { FluidText } from '@jayf0x/fluidity-js';

export const FancyHero = () => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <FluidText text="🔥 SupportsEmoji 🔥" fontSize={120} color="#ffffff" />
    </div>
  );
};
```

**FluidImage:**

```tsx
import { FluidImage } from '@jayf0x/fluidity-js';

export function Cover() {
  return (
    <div className="size-full">
      <FluidImage src="/hero.jpg" algorithm="aurora" />
    </div>
  );
}
```

**Handle custom events with a ref**

```tsx
import { useRef } from 'react';

import { FluidText } from '@jayf0x/fluidity-js';

export function Interactive() {
  const fluidRef = useRef<FluidHandle>(null);
  return (
    <>
      <FluidText ref={fluidRef} isMouseEnabled={false} text="Amazing" fontSize={120} color="#fff" />
      <button onClick={() => fluid.current?.reset()}>Reset</button>
      <button onClick={() => fluid.current?.updateConfig({ curl: 0.3 })}>Swirl</button>
    </>
  );
}
```

Official examples → [`demo/src/examples/`](./demo/src/examples/)

---

## Props

### FluidText

| Prop         | Type               | Default        |
| ------------ | ------------------ | -------------- |
| `text`       | `string`           | —              |
| `fontSize`   | `number`           | `100`          |
| `color`      | `string`           | `'#ffffff'`    |
| `fontFamily` | `string`           | `'sans-serif'` |
| `fontWeight` | `string \| number` | `900`          |

### FluidImage

| Prop        | Type               | Default   |
| ----------- | ------------------ | --------- |
| `src`       | `string`           | —         |
| `imageSize` | `string \| number` | `'cover'` |
| `effect`    | `number`           | `0`       |

### Shared props

| Prop              | Type                   | Default                |
| ----------------- | ---------------------- | ---------------------- |
| `config`          | `Partial<FluidConfig>` | —                      |
| `preset`          | `PresetKey`            | —                      |
| `algorithm`       | `FluidAlgorithm`       | `'standard'`           |
| `quality`         | `FluidQuality`         | `{ dpr: 1, sim: 0.5 }` |
| `backgroundColor` | `string`               | `'#0a0a0a'`            |
| `backgroundSrc`   | `string`               | —                      |
| `backgroundSize`  | `string \| number`     | `'cover'`              |
| `isMouseEnabled`  | `boolean`              | `true`                 |
| `isWorkerEnabled` | `boolean`              | `true`                 |
| `className`       | `string`               | —                      |
| `style`           | `CSSProperties`        | —                      |

---

## Algorithms

| Value        | Character                                         |
| ------------ | ------------------------------------------------- |
| `'standard'` | Colour overlay + gentle refraction (default)      |
| `'glass'`    | Strong UV distortion only — bent-glass, no colour |
| `'ink'`      | Dense opaque pigment that accumulates and stains  |
| `'aurora'`   | Velocity-field UV warp — liquid metal / lava-lamp |
| `'ripple'`   | Exaggerated normals + Fresnel rim — still water   |

```tsx
<FluidImage src="/photo.jpg" algorithm="aurora" />
<FluidText text="fluid" algorithm="ripple" config={{ warpStrength: 0.03 }} />
```

---

## Quality

`quality` controls rendering resolution on two independent axes. Both props are reactive — you can adjust them at runtime.

| Field | Range   | Default | Description                                                                                                                                 |
| ----- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `dpr` | 0.1 – 1 | `1`     | Canvas backing resolution as a fraction of `devicePixelRatio`. `0.5` on a Retina screen renders at 1× instead of 2×, saving ~75% fill rate. |
| `sim` | 0.1 – 1 | `0.5`   | Simulation FBO size as a fraction of canvas size. Lower = cheaper GPU, less fluid detail.                                                   |

```tsx
<FluidText text="hello" quality={{ dpr: 0.75, sim: 0.25 }} />
```

`dpr` and `sim` are independent — you can run a sharp canvas at a coarser simulation:

```tsx
// Sharp display, cheap simulation
<FluidImage src="/hero.jpg" quality={{ dpr: 1, sim: 0.2 }} />

// Lower display res, full simulation quality
<FluidImage src="/hero.jpg" quality={{ dpr: 0.5, sim: 1 }} />
```

---

## FluidConfig

| Key                   | Default            | Description                               |
| --------------------- | ------------------ | ----------------------------------------- |
| `densityDissipation`  | `0.992`            | How long ink lingers (0–1)                |
| `velocityDissipation` | `0.93`             | How fast velocity decays (0–1)            |
| `pressureIterations`  | `1`                | Jacobi iterations — accuracy vs. cost     |
| `curl`                | `0.0001`           | Vorticity / swirl. `0.2`–`0.5` for eddies |
| `splatRadius`         | `0.004`            | Brush radius                              |
| `splatForce`          | `0.91`             | Force applied by brush                    |
| `refraction`          | `0.25`             | Background warp strength                  |
| `specularExp`         | `1.01`             | Specular highlight sharpness              |
| `shine`               | `0.01`             | Highlight intensity                       |
| `waterColor`          | `[0, 0, 0]`        | Base fluid colour `[R, G, B]` (0–1)       |
| `glowColor`           | `[0.7, 0.85, 1.0]` | Glow / specular colour `[R, G, B]` (0–1)  |
| `warpStrength`        | `0.015`            | UV warp intensity (`aurora` algorithm)    |

---

## FluidHandle (ref)

| Method                           | Description                                           |
| -------------------------------- | ----------------------------------------------------- |
| `reset()`                        | Re-initialise simulation and reload source            |
| `updateConfig(patch)`            | Merge a partial config update into running sim        |
| `move({ x, y, strength? })`      | Programmatic pointer input (canvas-relative px)       |
| `splat(x, y, vx, vy, strength?)` | Inject a fluid splat directly — safe to call N×/frame |

---

## Presets

```tsx
<FluidText text="Wicked" preset="neon" />
<FluidText text="Wicked" preset="calm" />
```

Available: `calm` · `sand` · `wave` · `neon` · `smoke`

`preset` is reactive — changing it re-applies the preset config. Any `config` values you pass override the preset. `algorithm` prop also overrides the preset's algorithm.

---

## License

[MIT](./LICENSE)
