# fluidity-js — Upgrade your UX

[![npm version](https://img.shields.io/npm/v/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![npm downloads](https://img.shields.io/npm/dm/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@jayf0x/fluidity-js)](https://bundlephobia.com/package/@jayf0x/fluidity-js)
[![license](https://img.shields.io/npm/l/@jayf0x/fluidity-js)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./tsconfig.json)
[![CI](https://github.com/jayf0x/fluidity/actions/workflows/ci.yml/badge.svg)](https://github.com/jayf0x/fluidity/actions/workflows/ci.yml)

<a href="https://jayf0x.github.io/fluidity">
  <p align="center">
    <img src="assets/preview.gif" alt="Fluid text and image effects in React" height="300px"/>
  </p>
  <p align="center"><strong>Demo & Examples →</strong></p>
</a>

## Quickstart

```bash
bun add @jayf0x/fluidity-js
# npm / pnpm / aube
```

```tsx
import { FluidImage, FluidText } from '@jayf0x/fluidity-js';

// Fluid text — reacts to cursor movement
export const Hero = () => {
  return (
    <div style={{ width: '100%', height: 400 }}>
      <FluidText text="Hello World" fontSize={140} color="#ffffff" />
    </div>
  );
};

// Full-bleed fluid image
export const Cover = () => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FluidImage src="/hero.jpg" algorithm="aurora" />
    </div>
  );
};
```

---

## Programmatic control

Use `ref` to trigger effects from code — scroll-driven splats, click bursts, attract particles:

```tsx
import { useRef } from 'react';

import { FluidText } from '@jayf0x/fluidity-js';

export const Interactive = () => {
  const fluid = useRef<FluidHandle>(null);

  return (
    <>
      <div style={{ width: '100%', height: 400 }}>
        <FluidText ref={fluid} text="Splash!" fontSize={120} color="#fff" />
      </div>
      <button onClick={() => fluid.current?.splat(200, 200, 8, -4)}>Splat</button>
      <button onClick={() => fluid.current?.updateConfig({ curl: 0.5 })}>Swirl</button>
      <button onClick={() => fluid.current?.reset()}>Reset</button>
    </>
  );
};
```

| Method                           | What it does                                              |
| -------------------------------- | --------------------------------------------------------- |
| `reset()`                        | Restart the simulation                                    |
| `updateConfig(patch)`            | Change any config value live                              |
| `move({ x, y, strength? })`      | Simulate a pointer move                                   |
| `splat(x, y, vx, vy, strength?)` | Inject fluid directly — safe to call many times per frame |

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

| Prop                  | Type               | Default      |
| --------------------- | ------------------ | ------------ |
| `algorithm`           | `FluidAlgorithm`   | `'standard'` |
| `preset`              | `PresetKey`        | —            |
| `dpr`                 | `number`           | `1`          |
| `sim`                 | `number`           | `0.5`        |
| `densityDissipation`  | `number`           | `0.992`      |
| `velocityDissipation` | `number`           | `0.93`       |
| `pressureIterations`  | `number`           | `1`          |
| `curl`                | `number`           | `0.0001`     |
| `splatRadius`         | `number`           | `0.004`      |
| `splatForce`          | `number`           | `0.91`       |
| `refraction`          | `number`           | `0.25`       |
| `specularExp`         | `number`           | `1.01`       |
| `shine`               | `number`           | `0.01`       |
| `waterColor`          | `FluidColor`       | `'#000000'`  |
| `glowColor`           | `FluidColor`       | `'#b3d9ff'`  |
| `warpStrength`        | `number`           | `0.015`      |
| `backgroundColor`     | `string`           | `'#0a0a0a'`  |
| `backgroundSrc`       | `string`           | —            |
| `backgroundSize`      | `string \| number` | `'cover'`    |
| `isMouseEnabled`      | `boolean`          | `true`       |
| `isWorkerEnabled`     | `boolean`          | `true`       |
| `useWebGPU`           | `boolean`          | `true`       |
| `className`           | `string`           | —            |
| `style`               | `CSSProperties`    | —            |

---

## Algorithms

| Value        | Vibe                                             |
| ------------ | ------------------------------------------------ |
| `'standard'` | Colour overlay + gentle refraction (default)     |
| `'glass'`    | Bent-glass distortion, no colour                 |
| `'ink'`      | Dense opaque pigment that accumulates and stains |
| `'aurora'`   | Liquid metal / lava-lamp                         |
| `'ripple'`   | Still water surface with Fresnel rim             |

```tsx
<FluidImage src="/photo.jpg" algorithm="aurora" />
<FluidText text="fluid" algorithm="ripple" warpStrength={0.03} />
```

---

## Quality

Control rendering resolution on two independent axes — both reactive at runtime.

| Prop  | Range | Default | What it does                                                                              |
| ----- | ----- | ------- | ----------------------------------------------------------------------------------------- |
| `dpr` | 0.1–1 | `1`     | Canvas resolution as fraction of screen pixel ratio. `0.5` on Retina saves ~75% GPU fill. |
| `sim` | 0.1–1 | `0.5`   | Simulation resolution. Lower = cheaper, less detail.                                      |

```tsx
// Sharp canvas, cheap simulation
<FluidImage src="/hero.jpg" dpr={1} sim={0.2} />

// Lower canvas res, full simulation quality
<FluidImage src="/hero.jpg" dpr={0.5} sim={1} />
```

---

## Simulation props reference

| Prop                  | Default  | Description                                     |
| --------------------- | -------- | ----------------------------------------------- |
| `densityDissipation`  | `0.992`  | How long ink lingers (0–1)                      |
| `velocityDissipation` | `0.93`   | How fast fluid slows down (0–1)                 |
| `pressureIterations`  | `1`      | Quality vs. cost trade-off                      |
| `curl`                | `0.0001` | Swirl intensity. `0.2`–`0.5` for visible eddies |
| `splatRadius`         | `0.004`  | Brush radius                                    |
| `splatForce`          | `0.91`   | Force applied by brush                          |
| `refraction`          | `0.25`   | Background warp strength                        |
| `specularExp`         | `1.01`   | Specular highlight sharpness                    |
| `shine`               | `0.01`   | Highlight intensity                             |
| `waterColor`          | `#000`   | Base fluid colour (hex or `[R, G, B]` 0–1)      |
| `glowColor`           | `#b3d9ff`| Glow / specular colour (hex or `[R, G, B]` 0–1) |
| `warpStrength`        | `0.015`  | UV warp intensity (`aurora` algorithm)          |

---

## Browser support

Works in all modern browsers. Automatically picks the best renderer available — no configuration needed.

| Browser       | Support |
| ------------- | ------- |
| Chrome 113+   | ✅      |
| Edge 113+     | ✅      |
| Firefox       | ✅      |
| Safari 17+    | ✅      |
| Safari < 17   | ✅      |
| Mobile Chrome | ✅      |

---

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and [AGENTS.md](./AGENTS.md) for code conventions.

---

## License

[MIT](./LICENSE) © [jayf0x](https://github.com/jayf0x)
