# Changelog

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
