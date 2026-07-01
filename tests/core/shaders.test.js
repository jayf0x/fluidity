import { describe, expect, it } from 'vitest';

import { displayShader } from '../../src/core/shaders.ts';
import { displayWGSL } from '../../src/core/wgsl-shaders.ts';

// Shaders can't run under jsdom — these guard the source text against regressions.

// Bug #4 + improvement #9: Sobel spread uses sim texel size and scales with inverse density.
describe('display shader — Sobel spread (bug #4 + improvement #9)', () => {
  it('GLSL: spread is density-aware (sobelSpread = clamp(3/max(density,…)))', () => {
    expect(displayShader).toMatch(/sobelSpread\s*=\s*clamp/);
    expect(displayShader).not.toMatch(/texelSize\.x \* 6\.0/);
  });

  it('WGSL: spread is density-aware', () => {
    expect(displayWGSL).toMatch(/sobelSpread\s*=\s*clamp/);
    expect(displayWGSL).not.toMatch(/texelSize\.x \* 6\.0/);
  });
});
