# Changelog

## v1.0.11
- Add obstacleStrength parameter

## v1.0.10
- Add textblur and refraction; warpStrength image-only

## v1.0.9
- Fix: pre-blur density FBO (separable Gaussian) for smooth normals

## v1.0.8
- Add byte-snap optimization and compress-shader-literals
- Fix tangential velocity boundary conditions

## v1.0.7
- Internal/infrastructure changes only

## v1.0.6
- Improve Sobel spread: density-aware kernel + close warm-start

## v1.0.5
- Add more text controls
- Update fluidText parameters

## v1.0.4
- Fix: smooth highlights on low resolution
- Add Frontis library
- Apply Frontis integration
- Upgrade compress-shader-literals

## v1.0.3
- Fix: backgroundSrc
- Fix: WebGPU init queues

## v1.0.2
- Internal/infrastructure changes only

## v0.3.1
- Internal/infrastructure changes only

## v0.3.0
- Migrate to Vite 8
- Add npm Provenance for package integrity
- Replace local compress-shader-literals with released npm package

## v0.2.9
- Internal/infrastructure changes only

## v0.2.8
- Add bundle size optimization tooling
- Add log utility instead of raw console logs
- Fix mouse position seeding on first move to avoid streak from origin
- Fix DPR sync on alphaEnabled toggle

## v0.2.7
- Fix: DPR defaults to retina resolution
- Feat: improve TypeScript typing for `fluidColor`

## v0.2.5
- Feat: flatten all `FluidConfig` fields as direct component props — no nested `config` object
- Feat: simulation props accept normalized `0–1` float ranges (mapped to physics via `PROP_RANGES`)
- Feat: rename boolean props to cleaner names (`mouseEnabled`, `workerEnabled`, `webGPUEnabled`, `alphaEnabled`)
- Feat: set `aurora` as default algorithm with polished out-of-the-box simulation defaults

## v0.2.3
- Fix: pixelated specular highlights — 4-tap cross replaced with 8-tap Sobel normal kernel (GLSL + WGSL)
- Fix: specular highlights suppressed at low/fading density — eliminates highlight rings on dissipating strokes
- CI migrated from NPM to Bun

## v0.2.2
- Make canvas alpha optional
- Native string color support for `waterColor` / `glowColor`

## v0.2.1
- Full WebGPU backend (shaders, FBOs, render pipeline)
- New `useWebGPU` prop
- WebGPU reactiveness parity with WebGL path

## v0.1.7
- Documentation updates only

## v0.1.6
- Add `quality` prop (`{ dpr, sim }`) for resolution / sim scale control
- Fix quality reactiveness for `FluidImage`
- Guard texture upload on zero-dimension canvas

## v0.1.5
- Fix: text near `splatRadius` flickering
- Guard image load/destroy and FBO null refs

## v0.1.4
- Remove `textQuality` prop — consolidated into `quality`
- Shared types across `FluidImage` and `FluidText`
- Improved `FluidHandle` ref API (`move`, `splat`, `updateConfig`)
- Fix: background still black when `backgroundColor` is set
- Fix: image loading on localhost
- Global ambient typings via `globals.d.ts`

## v0.1.3
- First NPM / GitHub Packages release
- Added release CI flow

## v0.1.2 (desktop-v0.1.2)
- Full TypeScript migration (`.js` → `.ts` across all core modules)
- Add `splat()` to `FluidHandle` ref API
- Fix CURL + `backgroundSrc` obstacle detection
- Fix default params not applying in `useFluidControls`
- Preset reactivity improvements
- Drop UMD output — ESM-only package
- Isolated Leva stores per demo tab (zero bleed between examples)

## v0.1.1
- Initial public release
- Core Navier-Stokes fluid simulation (advection, divergence, pressure, vorticity)
- WebGL2 / WebGL1 renderer with Web Worker + OffscreenCanvas support
- `FluidText` and `FluidImage` React components with `forwardRef`
- `FluidHandle` ref API (`move`, `updateConfig`)
- Configurable algorithms, presets, splat radius/force, color, refraction
- Full test suite (config, gl-utils, fluid-controller, React components)
- MIT license
