## BUG/CORE: prop textQuality does not work

This prop was added to control how high quality the text must be rendered.
This was meant to solve the issue where text is badly pixelated edges. Eg. upscaling it first to then print the bitmap on a smaller canvas.

Currently the prop does not do much and setting it to higher values does not meaningfully increase the text.

This might be related:

```
Fonts on a JavaScript Canvas appear badly pixelated or blurry primarily because the canvas rendering resolution often does not match the device's high pixel density (Retina/High DPI screens), causing the browser to stretch a low-resolution bitmap to fit the display.  Additionally, text smoothing (anti-aliasing) is often enabled by default, which blurs sharp pixel fonts, and non-integer pixel offsets in CSS or transform operations can further degrade text crispness.
```

Expected outcome depends:

- If upgrading the quality of the text causes real performance decrease, then `textQuality=1` (or maybe even support values higher than 1) should give highest quality, while `textQuality=0` should give the current result with badly pixelated edges.
- if the performance is not hurt by increasing the text quality (eg. only initial setup), then simply always go for HQ and remove prop `textQuality`

## BUG/CORE: split `DEFAULT_PROPS` for image and text with good typing

File: src/core/config.ts

const `DEFAULT_PROPS` has no real typing and should.
Split this up into a shared, and custom per type (image, text).

FluidImage can use current default, andFluidText should sue the following defaults:

```js
densityDissipation: 0.99,
velocityDissipation: 0.98,
pressureIterations: 3,
curl: 0.15,
splatRadius: 0.01,
splatForce: 3,
refraction: 0.25,
specularExp: 1,
shine: 0.1,
glowColor: '#0080ff',

```

## BUG/CORE: `config` prop not reactive on its own

Files: src/react/FluidImage.tsx, src/react/FluidText.tsx

The preset/algorithm effect deps now include `config`, but since `config` is an object, a new reference each render will cause unnecessary re-fires. Ideally the effect should use a stable reference (useMemo on the consumer side, or deep-compare inside the lib). Low priority — advise users to memo their config object.

## BUG/CORE: `resize` edge case

File: src/core/simulation.ts ~line 169

`resize(width?, height?)` — if both args omitted, reads from canvas. Works today but fragile if called before canvas is mounted. Worth adding a guard.

## IMPROVEMENT: `uploadTexture` uses RGB not RGBA

File: src/core/textures.ts ~line 184

`uploadTexture` uses `gl.RGB` for internal/format. If a use-case ever needs alpha in obstacle/coverage textures this will break silently. Low priority.
