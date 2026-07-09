import { describe, expect, it } from 'vitest';

import { blurShader, displayShader, gradientSubtractShader } from '../../src/core/shaders.ts';
import { blurWGSL, displayWGSL, gradientSubtractWGSL } from '../../src/core/wgsl-shaders.ts';

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

// Improvement #10: density is pre-blurred (separable Gaussian, 2 passes) into its own
// FBO for smooth Sobel normals; the display pass's raw density (uTexture/uTex) must
// still drive colour/alpha directly, not the blurred copy.
describe('density pre-blur (improvement #10)', () => {
  it('blurShader/blurWGSL exist as a separable Gaussian (direction-based, 5-tap)', () => {
    expect(blurShader).toMatch(/uniform vec2 direction/);
    expect(blurShader).toMatch(/0\.38774/);
    expect(blurWGSL).toMatch(/direction/);
    expect(blurWGSL).toMatch(/0\.38774/);
  });

  it('display shaders sample the blurred density for Sobel taps, not raw density', () => {
    expect(displayShader).toMatch(/uniform sampler2D uDensityBlurred/);
    expect(displayShader).toMatch(/texture2D\(uDensityBlurred, vUv \+ vec2\(-sx, -sy\)\)/);
    expect(displayWGSL).toMatch(/uDensBlur\s*:\s*texture_2d<f32>/);
    expect(displayWGSL).toMatch(/textureSample\(uDensBlur, samp, i\.uv \+ vec2f\(-sx, -sy\)\)/);
  });

  it('raw density (used for colour/alpha) still comes from uTexture/uTex, not the blurred copy', () => {
    expect(displayShader).toMatch(/float density\s*=\s*max\(texture2D\(uTexture, vUv\)/);
    expect(displayWGSL).toMatch(/let density = max\(textureSample\(uTex, samp, i\.uv\)/);
  });
});
