# Bugs

Known defects. Pick one, fix it, add a test, remove the entry. Keep items short — link the code, not a essay.

| # | Bug | Files |
|---|-----|-------|
| 1 | Black outline on `<FluidText>` even with all-white colors — sub-pixel glyph edges fill black. Match fill to text color, or size text/backdrop ±1px. | `src/core/textures.ts` |
| 4 | Residual crunchy lines in specular highlights — fixed-pixel Sobel spread aliases at high DPR / low res. Make spread proportional to sim texel size. | `src/core/shaders.ts`, `src/core/wgsl-shaders.ts` |
