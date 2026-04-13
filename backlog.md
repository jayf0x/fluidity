
## CORE/BUG: whitespace around images should be interactive

**Status:** ✅ done — `backgroundColor` prop added to `FluidImage` (default `'#0a0a0a'`)
**Effort:** S

**Setup:** `FluidImage` with `imageSize="10%"` — tiny image in center, large black border. Fluid only interacts visually within image area.

**Root cause hypothesis:** The obstacle texture is built from the image bitmap (darkened+blurred). Outside the image = pure black = zero obstacle value. Fluid physics run fine everywhere, but display shows nothing interactive in the black area because `uWaterColor = [0,0,0]` = black fluid on black background = invisible.

**Fix options (pick one):**
1. Set `waterColor` to a subtle non-black default for image mode (e.g. `[0.03, 0.03, 0.05]`) so fluid is visible in empty areas.
2. Or: make the display shader show a subtle shimmer/refraction in areas where velocity > threshold even if density is low.
3. Or: fill empty canvas area with a configurable `backgroundColor` prop on `FluidImage`.

**Recommended:** Option 3 — add `backgroundColor` prop to `FluidImage` (default `'#0a0a0a'`), render as CSS `background` on container div. Visible area behind small image gets color, fluid refracts it. No shader change needed.

---

## DEMO/QUALITY: Refactor demo

**Status:** ✅ done — `constants.ts`, `useFluidConfig`, `useFluidControls` extracted; all examples refactored
**Effort:** M

Demo has duplicated code across 5 examples. Fix:
- Extract shared UI primitives already in `demo/src/components/Panel.tsx` — ensure all examples use them consistently (some still inline styles)
- Extract shared pattern: `useEffect(() => { ref.current?.updateConfig(patch) }, [patch])` into a `useFluidConfig(ref, config)` hook in `demo/src/hooks/useFluidConfig.ts`
- Extract shared mouse/keyboard shortcut patterns if any
- Move hardcoded image URLs to a constants file `demo/src/constants.ts`

Libraries: Leva already in `demo/package.json`. Feel free to use any utility lib (e.g. `clsx` for classnames).

---

## DEMO/FEATURE: refine options panel

**Status:** ✅ done — Leva integrated; `useFluidControls` hook + per-example `useControls('settings',...)`; Panel removed from all examples
**Effort:** M

Replace current custom `Panel` component with Leva's `useControls`.

Structure — create `demo/src/hooks/useFluidControls.ts`:
```ts
import { useControls, folder } from 'leva';
import type { FluidConfig } from 'fluidity-js';

export function useFluidControls(
  ref: React.RefObject<FluidHandle>,
  pageControls: Record<string, unknown>  // page-specific controls
) {
  // Shared section: all DEFAULT_CONFIG keys
  const shared = useControls('fluid config', {
    densityDissipation:  { value: 0.992, min: 0.9, max: 1.0, step: 0.001 },
    velocityDissipation: { value: 0.93,  min: 0.7, max: 1.0, step: 0.001 },
    pressureIterations:  { value: 25,    min: 1,   max: 60,  step: 1 },
    curl:                { value: 0.0001,min: 0,   max: 0.5, step: 0.001 },
    splatRadius:         { value: 0.004, min: 0.001, max: 0.03, step: 0.001 },
    splatForce:          { value: 0.91,  min: 0.1, max: 5.0, step: 0.01 },
    refraction:          { value: 0.25,  min: 0,   max: 1.0, step: 0.01 },
    specularExp:         { value: 1.01,  min: 0.1, max: 10,  step: 0.1 },
    shine:               { value: 0.01,  min: 0,   max: 0.15, step: 0.001 },
    waterColor:          '#000000',
    glowColor:           '#b3d9ff',
  });

  // Page-specific section
  const page = useControls('settings', folder(pageControls));

  // Sync shared config to simulation
  useEffect(() => {
    ref.current?.updateConfig(shared as Partial<FluidConfig>);
  }, [shared]);

  return { shared, page };
}
```

Each example passes its own `pageControls` (text content, image src picker, preset picker, etc.).

Leva renders its own floating panel automatically — remove manual `<Panel>` component from examples after migration.

---

## CORE/FEATURE: Add presets to library

**Status:** ✅ done — `PRESETS` + `PresetKey` exported from library; `preset` prop on `FluidText`/`FluidImage`; `mergeConfig(user, preset)` updated
**Effort:** S

Add named presets into the library so users can pass `preset="storm"` prop.

**In `src/core/config.js`:**
```js
export const PRESETS = {
  calm:  { densityDissipation: 0.999, velocityDissipation: 0.98, curl: 0.0001, splatRadius: 0.003, splatForce: 0.5, refraction: 0.15, shine: 0.005, glowColor: [0.6,0.85,1.0], waterColor: [0,0.02,0.05] },
  storm: { densityDissipation: 0.97,  velocityDissipation: 0.88, curl: 0.45,   splatRadius: 0.012, splatForce: 3.0, refraction: 0.6,  shine: 0.08,  glowColor: [0.2,0.3,0.8],  waterColor: [0,0,0.1] },
  wave:  { densityDissipation: 0.994, velocityDissipation: 0.92, curl: 0.2,    splatRadius: 0.005, splatForce: 1.2, refraction: 0.35, shine: 0.03,  pressureIterations: 30, glowColor: [0.5,0.8,1.0], waterColor: [0,0.01,0.03] },
  neon:  { densityDissipation: 0.985, velocityDissipation: 0.93, curl: 0.05,   splatRadius: 0.008, splatForce: 1.5, refraction: 0.25, specularExp: 0.5, shine: 0.14, glowColor: [1,0.2,0.8], waterColor: [0.05,0,0.08] },
  smoke: { densityDissipation: 0.996, velocityDissipation: 0.97, curl: 0.04,   splatRadius: 0.009, splatForce: 0.8, refraction: 0.08, shine: 0,     glowColor: [0.5,0.5,0.5], waterColor: [0.06,0.06,0.06] },
};
export type PresetKey = keyof typeof PRESETS;

export function mergeConfig(user = {}, preset) {
  const base = preset ? { ...DEFAULT_CONFIG, ...PRESETS[preset] } : DEFAULT_CONFIG;
  return { ...base, ...user };
}
```

**Update `FluidText` + `FluidImage` props:** add `preset?: PresetKey`. Pass through to `FluidController` → `FluidSimulation`.
**Update `types/index.d.ts`:** add `preset` to `FluidBaseProps`, export `PRESETS` and `PresetKey`.
**Update `mergeConfig` calls** in `FluidSimulation` constructor and `FluidController`.

Props still override preset (user config applied last).

---

## CORE/BUG: Effect gives flicker when close to text

**Status:** ✅ done — `max(..., 0.0)` clamped on all 5 density samples in `displayShader`
**Effort:** S

**Setup:** Black background, white text, `shine > 0`. Moving cursor close to text edge causes brief black flash on the text.

**Root cause:** Density FBO can hold slightly negative values near obstacle boundary (advection overshoots). In `displayShader`:
```glsl
float density = texture2D(uTexture, vUv).r;
vec3 color = mix(bg, uWaterColor, min(density * 1.5, 0.8));
```
When `density < 0`: `min(negative * 1.5, 0.8)` = negative → `mix(bg, black, negative)` = color beyond `bg` range → dark flash.

**Fix in `displayShader`:**
```glsl
float density = max(texture2D(uTexture, vUv).r, 0.0);
```
One line change. Also clamp neighbors for normal calculation consistency:
```glsl
float dL = max(texture2D(uTexture, vUv - ...).r, 0.0);
// etc.
```

---

## DEMO/FEATURE: Refine demo examples

**Status:** ✅ done — all `as never`/`as any` removed; Leva migration provides proper inferred types throughout
**Effort:** S

Fix TypeScript types in all examples. Current antipattern:
```ts
const updateCfg = (patch: object) => ref.current?.updateConfig(patch as never);
```
Fix:
```ts
import type { FluidConfig } from 'fluidity-js';
const updateCfg = (patch: Partial<FluidConfig>) => ref.current?.updateConfig(patch);
```

Audit all 5 examples for:
- Proper `FluidConfig` typing
- No `as any` / `as never` casts
- Consistent prop naming
- Each example showcases feature correctly with good defaults

File: `demo/src/examples/*.tsx`

---

## DEMO/FEATURE: SEO — demo site

**Status:** ✅ done — all meta tags added to `demo/index.html`; title updated. OG image (`og-image.png`) still needed — capture a screenshot and commit to `demo/public/`.
**Effort:** S

File: `demo/index.html`

Add to `<head>`:
```html
<meta name="description" content="fluidity-js — WebGL fluid simulation for React. Interactive text and image effects powered by Navier-Stokes." />
<meta name="keywords" content="webgl, fluid simulation, react, text effect, image effect, navier-stokes, canvas" />
<meta property="og:title" content="fluidity-js demo" />
<meta property="og:description" content="Interactive WebGL fluid effects for React — text, images, zero config." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://jayf0x.github.io/fluidity" />
<meta property="og:image" content="https://jayf0x.github.io/fluidity/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="fluidity-js" />
<meta name="twitter:description" content="WebGL fluid simulation for React." />
<link rel="canonical" href="https://jayf0x.github.io/fluidity/" />
```

Also: generate an OG image (1200×630px screenshot of demo) and commit to `demo/public/og-image.png`.

Add to `demo/vite.config.ts`: ensure title is `fluidity-js — interactive WebGL fluid`.

---

## GITHUB/FEATURE: Refine GitHub repo

**Status:** ✅ done — MIT LICENSE, `README.md`, `.github/workflows/deploy.yml`, repo description/homepage/topics updated via `gh`
**Effort:** M

**README.md** (root) — write modern package README:

Structure:
1. Hero — name + one-liner + badges (npm version, license, size)
2. Install: `npm i fluidity-js` / `pnpm add fluidity-js`
3. Quick start — 3 code snippets: FluidText, FluidImage, useFluid hook
4. Props table — `FluidTextProps`, `FluidImageProps`, `FluidConfig` (all keys, type, default, description)
5. `FluidHandle` ref API (reset, updateLocation, updateConfig)
6. Presets table (calm/storm/wave/neon/smoke)
7. Browser support note (WebGL2 required, WebGL1 fallback, OffscreenCanvas optional)

**GitHub repo settings** (do via `gh` CLI):
```bash
gh repo edit --description "WebGL fluid simulation for React — text & image effects" \
  --homepage "https://jayf0x.github.io/fluidity" \
  --add-topic webgl --add-topic fluid-simulation --add-topic react --add-topic animation
```

Create `LICENSE` if missing (MIT). Create `.github/workflows/deploy.yml` for auto GitHub Pages deploy on push to main.

---

## CORE/BUG: core cursor effect for images is off

**Status:** ⚠️ NEEDS USER CONFIRMATION — desired effect not decided yet. Do not implement without confirming approach with user first.
**Effort:** M–L (depends on chosen approach)

**Current behavior:** hovering image pushes white fluid on top, black background bleeds through where fluid displaces image pixels.

**Two candidate approaches — user must pick one:**

---

### Option A — UV Warp (distort the image itself)
Cursor stirs the image like wet paint. Image pixels displace and flow. No new color added — only the image's own pixels move.

**How:** In `displayShader`, instead of compositing white density over background, sample `uBackground` at a UV offset driven by the velocity field:
```glsl
// pass uVelocity as additional texture unit
vec2 vel = texture2D(uVelocity, vUv).xy;
vec2 warpedUv = vUv + vel * uWarpStrength;
vec3 color = texture2D(uBackground, warpedUv).rgb;
// add specular on top for liquid feel
color += spec * uGlowColor;
```
- Density FBO kept for physics only (no longer drives color)
- Add `warpStrength: 0.015` to config (replaces `refraction` role for image mode)
- Need to bind velocity FBO to display program (extra texture unit)
- **Feel:** liquid lens / ripple. Image smears and flows. Returns to original when cursor leaves (velocity dissipates).

---

### Option B — Refraction Only (glass-lens distortion)
Cursor creates a refractive lens effect — image appears to bulge, ripple, or warp under the cursor like looking through moving water. No new color. Image stays intact and snaps back.

**How:** Current display shader already does refraction via density-computed normals. Replace density opacity blend with pure refraction — no color overlay, only UV shift:
```glsl
float density = max(texture2D(uTexture, vUv).r, 0.0);
// normals from density gradient (same as now)
vec2 refrUv = vUv + normal.xy * uRefraction * density;
vec3 color = texture2D(uBackground, refrUv).rgb; // no mix with waterColor
color += spec * uGlowColor * density;
```
- Minimal change — remove `mix(bg, uWaterColor, ...)` line, keep everything else
- `waterColor` becomes irrelevant for image mode
- **Feel:** water surface / glass. Cursor area distorts image but no paint smear. Crisp and subtle.

---

**Recommended starting point:** Option B (smaller change, lower risk, still achieves "no black bleed" goal). Option A is more dramatic but requires passing velocity to display shader.
