import { describe, expect, it } from 'vitest';

import { displayShader } from '../../src/core/shaders.ts';
import { displayWGSL } from '../../src/core/wgsl-shaders.ts';

// Shaders can't run under jsdom — these guard the source text against regressions.

// Bug #4: Sobel spread must use sim texel size (* 3.0), not display texel size (* 6.0).
// The caller now passes sim texel size, so * 3.0 = 3 sim-texel spread at any DPR/simScale.
describe('display shader — Sobel spread proportional to sim texels (bug #4)', () => {
  it('GLSL uses * 3.0 spread (sim texel size)', () => {
    expect(displayShader).toMatch(/texelSize\.x \* 3\.0/);
    expect(displayShader).not.toMatch(/texelSize\.x \* 6\.0/);
  });

  it('WGSL uses * 3.0 spread (sim texel size)', () => {
    expect(displayWGSL).toMatch(/texelSize\.x \* 3\.0/);
    expect(displayWGSL).not.toMatch(/texelSize\.x \* 6\.0/);
  });
});
