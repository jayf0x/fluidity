# fluidity-js

**WebGL fluid simulation for React — interactive text and image effects powered by Navier-Stokes.**

[![npm](https://img.shields.io/npm/v/fluidity-js)](https://www.npmjs.com/package/@jayf0x/fluidity-js)
[![license](https://img.shields.io/npm/l/fluidity-js)](./LICENSE)
[![size](https://img.shields.io/bundlephobia/minzip/fluidity-js)](https://bundlephobia.com/package/@jayf0x/fluidity-js)

[**Live demo →**](https://jayf0x.github.io/fluidity)

---

## Install

```bash
npm i fluidity-js
# or
pnpm add fluidity-js
```

Requires React ≥ 17 and a browser with WebGL2 support.

---

## Quick start

### FluidText

```tsx
import { FluidText } from 'fluidity-js';

export function Hero() {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <FluidText text="hello world" fontSize={120} color="#ffffff" />
    </div>
  );
}
```

### FluidImage

```tsx
import { FluidImage } from 'fluidity-js';

export function Cover() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FluidImage src="/hero.jpg" imageSize="cover" />
    </div>
  );
}
```

### useFluid hook (custom canvas)

```tsx
import { useEffect, useRef } from 'react';

import { useFluid } from 'fluidity-js';

export function Custom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useFluid(containerRef, { worker: false });

  useEffect(() => {
    controllerRef.current?.setTextSource({ text: 'custom', fontSize: 80, color: '#fff' });
  }, []);

  return <div ref={containerRef} style={{ width: 400, height: 200 }} />;
}
```

---

## Props

### FluidTextProps

| Prop              | Type                   | Default        | Description                                                     |
| ----------------- | ---------------------- | -------------- | --------------------------------------------------------------- |
| `text`            | `string`               | —              | Text to render. Changes trigger a texture rebuild.              |
| `fontSize`        | `number`               | `100`          | Font size in pixels.                                            |
| `color`           | `string`               | `'#ffffff'`    | CSS colour string for the text.                                 |
| `fontFamily`      | `string`               | `'sans-serif'` | Font family.                                                    |
| `fontWeight`      | `string \| number`     | `900`          | Font weight.                                                    |
| `config`          | `Partial<FluidConfig>` | —              | Simulation config overrides.                                    |
| `preset`          | `PresetKey`            | —              | Named preset as base config.                                    |
| `algorithm`       | `FluidAlgorithm`       | `'standard'`   | Rendering algorithm (see below).                                |
| `backgroundColor` | `string`               | `'#0a0a0a'`    | CSS colour behind the canvas (shows through transparent areas). |
| `backgroundSrc`   | `string`               | —              | URL/path composited as background behind text.                  |
| `backgroundSize`  | `string \| number`     | `'cover'`      | Sizing mode for `backgroundSrc`.                                |
| `isMouseEnabled`  | `boolean`              | `true`         | Auto-wire mouse/touch events.                                   |
| `isWorkerEnabled` | `boolean`              | `true`         | Run in Web Worker via OffscreenCanvas.                          |
| `className`       | `string`               | —              | Class applied to the container div.                             |
| `style`           | `CSSProperties`        | —              | Inline styles merged on container div.                          |

### FluidImageProps

All shared props (above) plus:

| Prop        | Type               | Default   | Description                                                       |
| ----------- | ------------------ | --------- | ----------------------------------------------------------------- |
| `src`       | `string`           | —         | Image URL. Changing reloads the simulation.                       |
| `effect`    | `number`           | `0.4`     | Obstacle boundary strength (0–1).                                 |
| `imageSize` | `string \| number` | `'cover'` | `'cover'` \| `'contain'` \| `'50%'` \| `'200px'` \| scale factor. |

### FluidAlgorithm

| Value        | Visual character                                           |
| ------------ | ---------------------------------------------------------- |
| `'standard'` | Colour overlay blended over refracted background (default) |
| `'glass'`    | Strong UV distortion only — bent-glass, no colour overlay  |
| `'ink'`      | Dense opaque pigment accumulates and stains                |
| `'aurora'`   | Velocity-field UV warp — liquid metal / lava-lamp          |
| `'ripple'`   | Exaggerated normals + Fresnel rim — calm water surface     |

```tsx
<FluidImage src="/photo.jpg" algorithm="aurora" />
<FluidText text="fluid" algorithm="ripple" config={{ warpStrength: 0.03 }} />
```

### FluidConfig

| Key                   | Type             | Default            | Description                                                                                             |
| --------------------- | ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `densityDissipation`  | `number`         | `0.992`            | How long ink lingers (0–1).                                                                             |
| `velocityDissipation` | `number`         | `0.93`             | How quickly velocity decays (0–1).                                                                      |
| `pressureIterations`  | `number`         | `25`               | Jacobi iterations — higher is more accurate but slower.                                                 |
| `curl`                | `number`         | `0.0001`           | Vorticity confinement — swirl factor. Visible effect starts around `0.1`; `0.2`–`0.5` for strong swirl. |
| `splatRadius`         | `number`         | `0.004`            | Brush radius.                                                                                           |
| `splatForce`          | `number`         | `0.91`             | Force applied by brush.                                                                                 |
| `refraction`          | `number`         | `0.25`             | Background warp / refraction strength.                                                                  |
| `specularExp`         | `number`         | `1.01`             | Specular highlight exponent.                                                                            |
| `shine`               | `number`         | `0.01`             | Highlight intensity.                                                                                    |
| `waterColor`          | `[R, G, B]`      | `[0, 0, 0]`        | Base fluid colour (0–1 each).                                                                           |
| `glowColor`           | `[R, G, B]`      | `[0.7, 0.85, 1.0]` | Glow / specular colour (0–1 each).                                                                      |
| `algorithm`           | `FluidAlgorithm` | `'standard'`       | Display rendering algorithm.                                                                            |
| `warpStrength`        | `number`         | `0.015`            | UV warp intensity for the `aurora` algorithm.                                                           |

---

## FluidHandle (ref API)

```tsx
const ref = useRef<FluidHandle>(null);
// ...
ref.current?.reset();
ref.current?.updateConfig({ shine: 0.05, curl: 0.2 });
ref.current?.updateLocation({ x: 200, y: 150, strength: 5 });
```

| Method                                | Description                                                  |
| ------------------------------------- | ------------------------------------------------------------ |
| `reset()`                             | Re-initialises simulation and reloads source.                |
| `updateConfig(patch)`                 | Merges a partial config update into the running simulation.  |
| `updateLocation({ x, y, strength? })` | Programmatic pointer input (coordinates relative to canvas). |

---

## Presets

Pass `preset="storm"` (or any key below) to use a named configuration bundle. Your own `config` props override preset values.

```tsx
<FluidText text="wave" preset="wave" />
```

| Preset  | Description              |
| ------- | ------------------------ |
| `calm`  | Slow, peaceful drift     |
| `storm` | Violent, turbulent chaos |
| `wave`  | Rolling vortex eddies    |
| `neon`  | Vivid glowing highlights |
| `smoke` | Dense, rising smoke      |

You can also import `PRESETS` directly:

```ts
import { PRESETS } from 'fluidity-js';

// PRESETS.storm → Partial<FluidConfig>
```

---

## Browser support

| Feature                  | Support                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| WebGL2                   | Required (Chrome 56+, Firefox 51+, Safari 15+)                      |
| WebGL1                   | Automatic fallback                                                  |
| OffscreenCanvas + Worker | Chrome 69+, Firefox 105+ (auto-detected; falls back to main thread) |

---

## License

[MIT](./LICENSE)
