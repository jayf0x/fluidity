# fluidity-js — Upgrade your UX

[![npm version](https://img.shields.io/npm/v/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![npm downloads](https://img.shields.io/npm/dm/@jayf0x/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@jayf0x/fluidity-js)](https://bundlephobia.com/package/@jayf0x/fluidity-js)
[![license](https://img.shields.io/npm/l/@jayf0x/fluidity-js)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./tsconfig.json)
[![CI](https://github.com/jayf0x/fluidity/actions/workflows/ci.yml/badge.svg)](https://github.com/jayf0x/fluidity/actions/workflows/ci.yml)

<a href="https://jayf0x.github.io/fluidity">
  <p align="center">
    <img src="./assets/preview.gif" alt="Fluid text and image effects in React" height="300px"/>
  </p>
  <p align="center"><strong>Demo & Examples →</strong></p>
</a>

> ⭐ **Star [this repository](https://github.com/jayf0x/fluidity) if you’d like to support its growth**

## Quickstart

Choose your weapon:

```bash
bun add @jayf0x/fluidity-js
# OR pnpm / aube / yarn / npm ...
```

**Text**:

```tsx
import { FluidText } from '@jayf0x/fluidity-js';

<div style={{ width: '100%', height: 400 }}>
  <FluidText text="Howdy World" fontSize={140} />
</div>;
```

**Image**:

```tsx
import { FluidImage } from '@jayf0x/fluidity-js';

<div style={{ width: '100%', height: '100vh' }}>
  <FluidImage src="/hero.png" algorithm="aurora" />
</div>;
```

**Text + Image**:

```tsx
<div style={{ width: '100%', height: 400 }}>
  <FluidText text="Howdy World" backgroundSrc="/hero.png" />
</div>
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
| `move(x, y, strength?)`          | Simulate a pointer move                                   |
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
| `textBlur`   | `number`           | `1`            |

### FluidImage

| Prop           | Type               | Default   |
| -------------- | ------------------ | --------- |
| `src`          | `string`           | —         |
| `imageSize`    | `string \| number` | `'cover'` |
| `effect`       | `number`           | `0`       |
| `obstacleStrength` | `number`       | `0`       |
| `refraction`   | `number`           | `1.0`     |
| `warpStrength` | `number`           | `0.04`    |

### Shared props

| Prop                  | Type               | Default     |
| --------------------- | ------------------ | ----------- |
| `algorithm`           | `FluidAlgorithm`   | `'aurora'`  |
| `preset`              | `PresetKey`        | —           |
| `pixelRatio`          | `number`           | `1`         |
| `simResolution`       | `number`           | `0.5`       |
| `simMaxPixels`        | `number`           | — (uncapped) |
| `densityDissipation`  | `number`           | `0.83`      |
| `velocityDissipation` | `number`           | `0.91`      |
| `pressureIterations`  | `number`           | `1`         |
| `curl`                | `number`           | `0`         |
| `splatRadius`         | `number`           | `0.1`       |
| `splatForce`          | `number`           | `0.08`      |
| `specularExp`         | `number`           | `0`         |
| `shine`               | `number`           | `0`         |
| `waterColor`          | `FluidColor`       | `'#000000'` |
| `glowColor`           | `FluidColor`       | `'#b3d9ff'` |
| `backgroundColor`     | `string`           | `'#0a0a0a'` |
| `backgroundSrc`       | `string`           | —           |
| `backgroundSize`      | `string \| number` | `'cover'`   |
| `mouseEnabled`        | `boolean`          | `true`      |
| `workerEnabled`       | `boolean`          | `true`      |
| `webGPUEnabled`       | `boolean`          | `true`      |
| `alphaEnabled`        | `boolean`          | `true`      |
| `className`           | `string`           | —           |
| `style`               | `CSSProperties`    | —           |

---

## Algorithms

| Value        | Vibe                                             |
| ------------ | ------------------------------------------------ |
| `'aurora'`   | Liquid metal / lava-lamp (default)               |
| `'standard'` | Colour overlay + gentle refraction               |
| `'glass'`    | Bent-glass distortion, no colour                 |
| `'ink'`      | Dense opaque pigment that accumulates and stains |
| `'ripple'`   | Still water surface with Fresnel rim             |

```tsx
<FluidImage src="/photo.jpg" algorithm="aurora" warpStrength={0.3} />
<FluidText text="fluid" algorithm="ripple" />
```

---

## Quality

Control rendering resolution on independent axes — all reactive at runtime.

| Prop             | Range | Default      | What it does                                                                            |
| ---------------- | ----- | ------------ | ---------------------------------------------------------------------------------------- |
| `pixelRatio`     | 0.1–1 | `1`          | Canvas resolution as fraction of devicePixelRatio. `0.5` on Retina saves ~75% GPU fill. |
| `simResolution`  | 0.1–1 | `0.5`        | Simulation FBO size. Lower = cheaper, less detail.                                      |
| `simMaxPixels`   | >0    | — (uncapped) | Hard cap on simWidth × simHeight, applied after `simResolution`. Both sim axes scale down together (aspect ratio preserved) so ultra-wide or ultra-tall containers stay responsive without a runaway texel count on one axis. |

```tsx
// Ultra-wide hero banner — cap the sim grid regardless of how wide the container gets
<FluidImage src="/banner.jpg" simResolution={1} simMaxPixels={500_000} />
```

```tsx
// Sharp canvas, cheap simulation
<FluidImage src="/hero.jpg" pixelRatio={1} simResolution={0.2} />

// Lower canvas res, full simulation quality
<FluidImage src="/hero.jpg" pixelRatio={0.5} simResolution={1} />
```

---

## Simulation props reference

Simulation props that have a physics range accept a **normalized `0–1` value** — no need to know the raw shader units. Values outside `[0, 1]` are passed through as raw physics values for advanced overrides.

| Prop                  | Default   | Range  | Physics range | Description                                     |
| --------------------- | --------- | ------ | ------------- | ----------------------------------------------- |
| `densityDissipation`  | `0.83`    | `0–1`  | `0.94–1.0`    | How long ink lingers                            |
| `velocityDissipation` | `0.91`    | `0–1`  | `0.9–0.999`   | How fast fluid slows down                       |
| `pressureIterations`  | `1`       | `1–50` | —             | Pressure solve quality vs. cost                 |
| `curl`                | `0`       | `0–1`  | —             | Swirl intensity                                 |
| `splatRadius`         | `0.1`     | `0–1`  | `0.001–0.04`  | Brush radius                                    |
| `splatForce`          | `0.08`    | `0–1`  | `0.1–5.0`     | Force applied by brush                          |
| `refraction`          | `1.0`     | `0–1`  | —             | Background warp strength                        |
| `specularExp`         | `0`       | `0–1`  | `0.1–10`      | Specular highlight sharpness                    |
| `shine`               | `0`       | `0–1`  | `0–0.15`      | Highlight intensity                             |
| `warpStrength`        | `0.04`    | `0–1`  | `0.001–0.1`   | UV warp intensity (`aurora` algorithm)          |
| `waterColor`          | `#000`    | —      | —             | Base fluid colour (hex or `[R, G, B]` 0–1)      |
| `glowColor`           | `#b3d9ff` | —      | —             | Glow / specular colour (hex or `[R, G, B]` 0–1) |

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and [AGENTS.md](./AGENTS.md) for code conventions.

---

## License

[MIT](./LICENSE) © [jayf0x](https://github.com/jayf0x)
