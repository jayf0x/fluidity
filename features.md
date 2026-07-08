# Features

New capabilities and enhancements. Pick one, build it, add a test, remove the entry. Keep items short — link the code, not an essay.

## Features

| # | Feature | Files |
|---|---------|-------|
| 3 | `obstacleStrength` prop (0–1) — image luminance drives the physics obstacle. Default `0` = current behaviour. | `src/globals.d.ts`, `src/core/textures.ts`, `src/core/config.ts` |
| 4 | Transparency in fluid colors — let the page behind the canvas show through. Clarify which props accept alpha first. | `src/globals.d.ts`, `src/core/config.ts`, `src/core/shaders.ts`, `src/core/simulation.ts` |
| 5 | Per-axis `simResolutionX`/`simResolutionY` (or `simMaxPixels` cap) — stay responsive at extreme aspect ratios. | `src/core/config.ts`, `src/core/simulation.ts` |
| 6 | Split React components/hook into `@jayf0x/fluidity-js/react` subpackage for tree-shaking. Breaking change — coordinate changelog. | `package.json`, `vite.config.ts`, `src/index.ts` |

## Improvements

| # | Improvement | Files |
|---|-------------|-------|
| 10 | Pre-blur density FBO (separable Gaussian) for smooth normals; raw density still drives color/alpha. | `src/core/shaders.ts`, `src/core/wgsl-shaders.ts`, `src/core/simulation.ts` |
