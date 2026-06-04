## DOCS/BUG: README inline code examples use stale prop values

The algorithm section shows:

```tsx
<FluidText text="fluid" algorithm="ripple" warpStrength={0.03} />
```

Two problems post-normalization:

1. `warpStrength` is aurora-specific — it has no effect on the ripple algorithm. The example misleads readers about what `warpStrength` does.
2. `warpStrength={0.03}` is now a normalized value → physics `≈ 0.004` (near-minimum, invisible). The old physics intent was `0.03`. A visible normalized value would be `≈ 0.3`.

Fix: replace the example with something accurate — e.g. show `warpStrength` with `algorithm="aurora"` at a visible normalized value, and show `ripple` with a prop that actually affects it (e.g. `refraction`).

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

## RENDER/BUG: density accumulation glow when densityDissipation=1

When `densityDissipation` is exactly 1.0 (no fade), density accumulates unbounded across frames. Values exceed 1.0 in the FBO, which causes the specular and color calculations to saturate and produce a halo/glow "colour shadow" that doesn't correspond to actual fluid.

Scope: clamp the density FBO output or add a soft saturation curve so density is always in a predictable range regardless of dissipation setting. Could be a `clamp` in the advection output or a `tanh`/`smoothstep` saturation in the display shader before the normal/specular calculation.

## RENDER/BUG: residual crunchy lines in specular highlights

The Sobel normal kernel at 6-display-px spread reduced aliasing significantly but didn't fully eliminate jagged specular highlights when a stroke settles. Root cause: the density FBO at `simScale=0.5` still has a relatively low sample count, and the Sobel kernel at a fixed pixel spread becomes too small relative to the splat size at high resolution or too large at low resolution.

Scope: consider making the normal-sample spread proportional to the sim texel size rather than the display texel size — i.e. `spread = N / simWidth` rather than `N / displayWidth`. This keeps the kernel consistently ≈N sim-texels wide regardless of DPR or simResolution. Alternatively, add a single-pass separable Gaussian blur of the density FBO before the display pass to produce a smooth "height field" for normal computation.

## RENDER/IMPROVEMENT: pre-blur density FBO for normal computation

The in-shader Sobel kernel (8 taps) is a reasonable approximation but a separable Gaussian blur of the density FBO (2 passes, ~5 taps each) would produce a mathematically smooth height field, eliminating all specular aliasing at any resolution. The blurred FBO would only be used for normal/specular — the raw density FBO still drives color and alpha.

Scope: add a `blurDensity` FBO (same dimensions as density), run two separable blur passes (horizontal + vertical) once per frame before the display pass, bind the blurred texture as the source for normal computation only. Cost: 2 extra render passes per frame, ~10 texture taps total.

## RENDER/IMPROVEMENT: density-aware specular radius

Currently normals are computed at a fixed spread. A large spread creates smooth normals but loses fine detail; a small spread preserves detail but aliases. The ideal spread depends on local density: in high-density regions use a finer kernel, in low-density regions use a wider one (or suppress specular entirely, which the `specDen` term partially does).

Scope: weight the Sobel spread or kernel size by a function of local density. Could be as simple as scaling the kernel spread by `1.0 + (1.0 - density) * k` so the kernel expands as density fades — matching less specular detail where the fluid is thin.

## PHYSICS/IMPROVEMENT: velocity boundary layer at obstacle edges

With the current branchless `(1-obs)` weight, velocity drops to zero inside the obstacle but there is no explicit tangential (slip) condition at the boundary. This can leave a thin layer of incorrect velocity just outside the text that slightly distorts the flow path.

Scope: after the gradient-subtract pass, add a "boundary condition" step that projects the velocity at each boundary-adjacent cell to be tangential to the obstacle gradient. The obstacle gradient `∇obs` (computed via a 2-tap finite difference of the obstacle texture) gives the surface normal; subtract the normal component from velocity at cells where `obs > 0 && obs < 0.5`.

## PHYSICS/IMPROVEMENT: pressure initialisation warm-start

Each frame the pressure FBO is solved from whatever pressure was left over from the previous frame. With `pressureIterations=1` (default), the solver barely moves from whatever garbage was there. Warm-starting from the previous frame's converged pressure would mean even 1 iteration produces a much better result.

Scope: rather than clearing the pressure FBO each frame, keep it as-is and only run the Jacobi iterations. The dissipation of the velocity field each frame means the divergence changes slowly, so the previous pressure is a good initial guess. No new FBOs needed — just remove any explicit pressure-clear before the solve loop.

## CORE/FEATURE: configurable simResolution per-axis

Currently `simResolution` is a single scalar applied to both width and height. Widescreen canvases waste sim budget on the height axis. Allowing separate X/Y scale (or automatically capping the sim to a max pixel count) would let the simulation stay responsive at extreme aspect ratios.

Scope: add `simResolutionX` / `simResolutionY` props (or a `simMaxPixels` cap) to `FluidBaseProps`. Internal `#simWidth` / `#simHeight` computation in `simulation.ts` would respect these independently.

## CORE/FEATURE: implement textQuality prop

`TextSourceOpts.textQuality` exists in the interface with docs ("Oversample factor for the text canvas before upload. Default: 2") but is not used anywhere in `createTextTextures` or `createTextTexturesGPU`. High-density text at small font sizes becomes blurry obstacle/coverage textures.

Scope: use `textQuality` in both `createTextTextures` and `createTextTexturesGPU` — draw text onto a `width*textQuality × height*textQuality` canvas, then downsample to `width × height` before upload. This anti-aliases the obstacle/coverage texture.

## CORE/FEATURE: image mode obstacle from luminance

The image obstacle texture is created as `brightness(effect) blur(8px)` where `effect` defaults to `0`, making `brightness(0)` = solid black = no obstacle at all. Most image-mode users never see obstacle behaviour because the default is off.

Scope: reconsider the `effect` prop semantics, or add a separate `obstacleStrength` prop (0–1) that controls how much the image luminance contributes to the physics obstacle. A value of 0.5 would let bright image regions mildly deflect fluid, creating natural interaction between the image content and the simulation.

---
