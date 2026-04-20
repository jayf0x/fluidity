# fluidity-js

**WebGL fluid simulation for React — interactive text and image effects powered by Navier-Stokes.**

[![npm](https://img.shields.io/npm/v/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![license](https://img.shields.io/npm/l/@jayf0x/fluidity-js)](./LICENSE)
[![size](https://img.shields.io/bundlephobia/minzip/@jayf0x/fluidity-js)](https://bundlephobia.com/package/@jayf0x/fluidity-js)

[**Live demo →**](https://jayf0x.github.io/fluidity)

---

## Install

```bash
npm i @jayf0x/fluidity-js
```

Requires React ≥ 17 and WebGL (WebGL2 recommended; WebGL1 supported as fallback).

---

## Usage

### FluidText

```tsx
import { FluidText } from '@jayf0x/fluidity-js';

export function Hero() {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <FluidText text="hello" fontSize={120} color="#ffffff" />
    </div>
  );
}
```

### FluidImage

```tsx
import { FluidImage } from '@jayf0x/fluidity-js';

export function Cover() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FluidImage src="/hero.jpg" algorithm="aurora" />
    </div>
  );
}
```

### Ref API

```tsx
import { useRef } from 'react';

import { FluidText } from '@jayf0x/fluidity-js';

export function Interactive() {
  const fluid = useRef<FluidHandle>(null);

  return (
    <>
      <div style={{ width: '100%', height: 300 }}>
        <FluidText ref={fluid} text="fluid" fontSize={120} color="#fff" />
      </div>
      <button onClick={() => fluid.current?.reset()}>Reset</button>
      <button onClick={() => fluid.current?.updateConfig({ curl: 0.3 })}>Swirl</button>
    </>
  );
}
```

`FluidHandle` is a global type — no import needed.

More examples → [`demo/src/examples/`](./demo/src/examples/)

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

| Prop              | Type                   | Default      |
| ----------------- | ---------------------- | ------------ |
| `config`          | `Partial<FluidConfig>` | —            |
| `preset`          | `PresetKey`            | —            |
| `algorithm`       | `FluidAlgorithm`       | `'standard'` |
| `backgroundColor` | `string`               | `'#0a0a0a'`  |
| `backgroundSrc`   | `string`               | —            |
| `backgroundSize`  | `string \| number`     | `'cover'`    |
| `isMouseEnabled`  | `boolean`              | `true`       |
| `isWorkerEnabled` | `boolean`              | `true`       |
| `className`       | `string`               | —            |
| `style`           | `CSSProperties`        | —            |

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
