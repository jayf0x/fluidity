import { describe, expect, it } from 'vitest';

import { displayShader, gradientSubtractShader } from '../../src/core/shaders.ts';
import { displayWGSL, gradientSubtractWGSL } from '../../src/core/wgsl-shaders.ts';

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

// Improvement #8: slip velocity BC — tangential component preserved at obstacle
// edges instead of being fully zeroed by a uniform (1.0 - obs) damp.
describe('gradient-subtract shader — slip boundary condition (improvement #8)', () => {
  it('GLSL projects velocity onto the obstacle-gradient tangent, not a flat (1-obs) damp', () => {
    expect(gradientSubtractShader).toMatch(/obsGrad/);
    expect(gradientSubtractShader).toMatch(/velTang/);
    expect(gradientSubtractShader).not.toMatch(/\* \(1\.0 - obs\)/);
  });

  it('WGSL projects velocity onto the obstacle-gradient tangent, not a flat (1-obs) damp', () => {
    expect(gradientSubtractWGSL).toMatch(/obsGrad/);
    expect(gradientSubtractWGSL).toMatch(/velTang/);
    expect(gradientSubtractWGSL).not.toMatch(/\* \(1\.0 - obs\)/);
  });
});
