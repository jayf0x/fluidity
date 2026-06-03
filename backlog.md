## CORE/FEATURE + DEMO/FEATURE: better value ranges

Prop values for simulation fields are currently raw shader/physics values (e.g. `densityDissipation={0.992}`). These are non-intuitive — a user has no way to guess that `0.992` means "fairly persistent" or that the useful range is only `0.94–1.0`. The goal is to normalize all simulation props to a `0–1` float scale so users think in percentages, while the simulation receives the correct internal value.

### Affected fields and their physics ranges

These ranges come from the Leva schema in `demo/src/hooks/useFluidControls.ts` and represent the full visual range of each param:

| Prop | Physics min | Physics max | Current default | Normalized default (approx) |
|------|-------------|-------------|-----------------|------------------------------|
| `densityDissipation` | 0.94 | 1.0 | 0.992 | 0.87 |
| `velocityDissipation` | 0.9 | 0.999 | 0.93 | 0.30 |
| `splatRadius` | 0.001 | 0.04 | 0.004 | 0.08 |
| `splatForce` | 0.1 | 5.0 | 0.91 | 0.17 |
| `specularExp` | 0.1 | 10 | 1.01 | 0.09 |
| `shine` | 0.0 | 0.15 | 0.01 | 0.07 |
| `warpStrength` | 0.001 | 0.1 | 0.015 | 0.14 |

**Already 0–1 (no change needed):** `curl`, `refraction`, `pixelRatio`, `simResolution`

**Integer, not float:** `pressureIterations` (range 1–50) — normalize as `Math.round(1 + 49 * t)` or keep as-is (acceptable to leave for this ticket).

### Normalization formula

```ts
// Linear lerp: t ∈ [0, 1] → [physicsMin, physicsMax]
function toPhysics(t: number, min: number, max: number): number {
  return min + (max - min) * t;
}

// Inverse: physics value → normalized [0, 1]
function toNormalized(v: number, min: number, max: number): number {
  return (v - min) / (max - min);
}
```

Values outside `[0, 1]` should pass through unchanged (no clamping) — this lets power users still pass raw physics values.

### Implementation plan

#### 1. `src/core/config.ts` — add `PROP_RANGES` and `normalizeConfig`

```ts
export const PROP_RANGES: Partial<Record<keyof FluidConfig, [number, number]>> = {
  densityDissipation:  [0.94,  1.0 ],
  velocityDissipation: [0.9,   0.999],
  splatRadius:         [0.001, 0.04 ],
  splatForce:          [0.1,   5.0  ],
  specularExp:         [0.1,   10   ],
  shine:               [0.0,   0.15 ],
  warpStrength:        [0.001, 0.1  ],
};

/**
 * Maps any prop with a defined range from normalized [0,1] → physics value.
 * Values outside [0,1] are passed through unchanged (power-user raw override).
 * Props without a range entry are returned unchanged.
 */
export function normalizeConfig(config: Partial<FluidConfig>): Partial<FluidConfig> {
  const out: Partial<FluidConfig> = { ...config };
  for (const [key, range] of Object.entries(PROP_RANGES) as [keyof FluidConfig, [number, number]][]) {
    const val = config[key] as number | undefined;
    if (val === undefined) continue;
    if (val >= 0 && val <= 1) {
      (out as Record<string, number>)[key] = range[0] + (range[1] - range[0]) * val;
    }
    // values outside [0,1] → unchanged
  }
  return out;
}
```

#### 2. `src/react/FluidText.tsx` and `src/react/FluidImage.tsx`

Apply `normalizeConfig` before passing to `mergeConfig` and `updateConfig`:

```ts
// In the component, replace:
const configProps = Object.fromEntries(...) as Partial<FluidConfig>;

// With:
const configProps = normalizeConfig(Object.fromEntries(...) as Partial<FluidConfig>);
```

Apply in both:
- The initial `useFluid(containerRef, { config: mergeConfig(configProps, ...) })` call
- The reactive `useEffect` that calls `updateConfig(mergeConfig(configProps, ...))`

#### 3. Update `DEFAULT_CONFIG` and `DEFAULT_CONFIG_TEXT` in `src/core/config.ts`

Change raw physics defaults to normalized equivalents so `<FluidText />` with no props gives the same visual result as before:

```ts
// Example: densityDissipation 0.992 → ~0.87 in normalized space
DEFAULT_CONFIG = {
  densityDissipation: 0.87,   // was 0.992
  velocityDissipation: 0.30,  // was 0.93
  splatRadius: 0.08,          // was 0.004
  splatForce: 0.17,           // was 0.91
  specularExp: 0.09,          // was 1.01
  shine: 0.07,                // was 0.01
  warpStrength: 0.14,         // was 0.015
  // unchanged:
  pressureIterations: 1,
  curl: 0.0001,
  refraction: 0.25,
  waterColor: '#000000',
  glowColor: '#b3d9ff',
  algorithm: 'standard',
};
```

Do the same for `DEFAULT_CONFIG_TEXT`.

#### 4. Update `PRESETS` in `src/core/config.ts`

All preset values that have a range entry need to be converted to normalized space. Example:

```ts
calm: {
  densityDissipation: toNormalized(0.999, 0.94, 1.0),  // ≈ 0.983
  velocityDissipation: toNormalized(0.98, 0.9, 0.999), // ≈ 0.909
  // ...
}
```

Run `toNormalized(v, min, max)` for every field in every preset that appears in `PROP_RANGES`.

#### 5. Update `demo/src/hooks/useFluidControls.ts`

Leva slider ranges stay as `[0, 1]` for all normalized fields. Defaults become the new normalized values. Example:

```ts
densityDissipation: { value: 0.87, min: 0, max: 1, step: 0.01 },
velocityDissipation: { value: 0.30, min: 0, max: 1, step: 0.01 },
splatRadius:         { value: 0.08, min: 0, max: 1, step: 0.01 },
splatForce:          { value: 0.17, min: 0, max: 1, step: 0.01 },
specularExp:         { value: 0.09, min: 0, max: 1, step: 0.01 },
shine:               { value: 0.07, min: 0, max: 1, step: 0.01 },
warpStrength:        { value: 0.14, min: 0, max: 1, step: 0.01 },
```

Also update `customDefaults` entries in all example files (`TextExample`, `ImageExample`, `SplashExample`, `SplitExample`) to use normalized values.

#### 6. Update `README.md` and `CLAUDE.md`

- Document `PROP_RANGES` and `normalizeConfig` in CLAUDE.md
- Update the FluidConfig reference table in README.md to show `0–1` ranges for normalized fields and note the internal physics range in the description

### Constraints

- **No clamping.** Values outside `[0, 1]` pass through as raw physics values (advanced override).
- **`pressureIterations`** is an integer — decide: either keep raw (1–50) or normalize with `Math.round`. If normalized, the step in the Leva schema should become `0.02` (≈ 1/50). Can defer.
- **`mergeConfig` is not changed** — normalization happens before it, in the component layer only. `mergeConfig` always works in physics-value space.
- **`updateConfig(patch)` on `FluidHandle`** — this is a ref method called by users post-mount. It currently passes raw values directly to the sim. After this change, `updateConfig` should also normalize (apply `normalizeConfig` inside the component's `updateConfig` implementation). Update `useImperativeHandle` in both components.

### Tests to add / update

1. `tests/core/config.test.js` — test `normalizeConfig`:
   - `densityDissipation: 0` → `0.94`
   - `densityDissipation: 1` → `1.0`
   - `densityDissipation: 0.5` → `0.97`
   - `densityDissipation: 1.5` → `1.5` (raw passthrough)
   - Fields without range entry unchanged
2. Update any test that uses raw physics defaults in assertions
3. Check `tests/react/FluidText.test.jsx` — `updateConfig({ shine: 0.5 })` should hit the mock with the physics value `0.075` (normalized)

### Files to change

- `src/core/config.ts` — add `PROP_RANGES`, `normalizeConfig`; update `DEFAULT_CONFIG`, `DEFAULT_CONFIG_TEXT`, `PRESETS`
- `src/react/FluidText.tsx` — apply `normalizeConfig` to `configProps`; apply in `updateConfig` ref method
- `src/react/FluidImage.tsx` — same
- `src/index.ts` — export `PROP_RANGES`, `normalizeConfig`
- `demo/src/hooks/useFluidControls.ts` — update slider defaults/ranges
- `demo/src/examples/*.tsx` — update all numeric config defaults to normalized values
- `README.md` — update FluidConfig reference table
- `CLAUDE.md` — document `PROP_RANGES` / `normalizeConfig`
- `tests/core/config.test.js` — add normalizeConfig tests

---

## CORE/FEATURE - separate packages

Move react hook to seprate module to optimize three-shaking.

expected:

```tsx
import { FluidImage, FluidText } from '@jayf0x/fluidity-js/react';
```

## CORE/FEATURE: add support for text positioning customization

Currently no support to move text to left or align on right.

Task: add prop `textAlign` to `<FluidText` to update text positioning in `src/core/textures.ts`.
Default remains 'center'.

## CORE/FEATURE: Support transparency in colors

tbd.

## CORE/BUG: black outline on Text

On `<FluidText` there is a tiny black border on the text. Even visible when setting all colors (background, text, shine...) to white, there is still a tiny black border.

It looks like some source of blackness is filling the pixelated edges of the text.

Expected:
Either to have this source of blackness set to the text-color so there are no conflicts or no fill at all (if possible).

Or maybe make the text itself just 1px larger or the backdrop text 1px smaller?

## CORE/BUG backgroundSrc not working for text

tbd.

---
