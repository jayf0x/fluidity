# Bugs

Known defects. Pick one, fix it, add a test, remove the entry. Keep items short — link the code, not a essay.

| # | Bug | Files |
|---|-----|-------|
| 1 | Black outline on `<FluidText>` even with all-white colors — sub-pixel glyph edges fill black. Match fill to text color, or size text/backdrop ±1px. | `src/core/textures.ts` |
| 2 | `backgroundSrc` prop has no effect on `<FluidText>`. | `src/core/textures.ts`, `src/react/FluidText.tsx` |
| 3 | Density accumulation glow when `densityDissipation=1` — density exceeds 1.0, saturates specular/color. Clamp or soft-saturate density before display. | `src/core/shaders.ts`, `src/core/wgsl-shaders.ts`, `src/core/simulation.ts` |
| 4 | Residual crunchy lines in specular highlights — fixed-pixel Sobel spread aliases at high DPR / low res. Make spread proportional to sim texel size. | `src/core/shaders.ts`, `src/core/wgsl-shaders.ts` |
| 5 | README example `algorithm="ripple" warpStrength={0.03}` is wrong post-normalization — `warpStrength` is aurora-only and `0.03` normalized ≈ invisible. Show accurate examples. | `README.md` |
