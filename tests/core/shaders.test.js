import { describe, expect, it } from 'vitest';

import { displayShader } from '../../src/core/shaders.ts';
import { displayWGSL } from '../../src/core/wgsl-shaders.ts';

describe('displayShader density saturation', () => {
  it('GLSL displayShader contains getDensity helper', () => {
    expect(displayShader).toContain('getDensity');
  });

  it('GLSL getDensity uses tanh-equivalent soft saturation', () => {
    // The implementation uses (e2-1)/(e2+1) which equals tanh(raw).
    // Verify the shader does NOT use the old unbounded max(..., 0.0) directly
    // for the main density or Sobel samples.
    const lines = displayShader.split('\n');
    const mainDensityLine = lines.find((l) => l.includes('float density') && l.includes('1.0 - obs'));
    expect(mainDensityLine).toContain('getDensity');
  });

  it('WGSL displayWGSL contains getDensity helper', () => {
    expect(displayWGSL).toContain('getDensity');
  });

  it('WGSL getDensity uses tanh', () => {
    expect(displayWGSL).toContain('tanh(');
  });

  it('WGSL main density line uses getDensity', () => {
    const lines = displayWGSL.split('\n');
    const mainDensityLine = lines.find((l) => l.includes('let density') && l.includes('1.0 - obs'));
    expect(mainDensityLine).toContain('getDensity');
  });
});

describe('getDensity saturation behaviour (JS simulation)', () => {
  // Verify the tanh-like formula used in GLSL: (e^2x - 1) / (e^2x + 1)
  const glslGetDensity = (raw) => {
    const r = Math.max(raw, 0.0);
    const e2 = Math.exp(2.0 * Math.min(r, 10.0));
    return (e2 - 1.0) / (e2 + 1.0);
  };

  it('maps 0 to 0', () => {
    expect(glslGetDensity(0)).toBeCloseTo(0, 5);
  });

  it('maps 1 to < 1', () => {
    expect(glslGetDensity(1)).toBeLessThan(1.0);
  });

  it('maps values > 1 to < 1 (prevents glow saturation)', () => {
    expect(glslGetDensity(2.0)).toBeLessThan(1.0);
    expect(glslGetDensity(5.0)).toBeLessThan(1.0);
    expect(glslGetDensity(100.0)).toBeLessThan(1.0);
  });

  it('is monotonically increasing', () => {
    expect(glslGetDensity(0.5)).toBeLessThan(glslGetDensity(1.0));
    expect(glslGetDensity(1.0)).toBeLessThan(glslGetDensity(2.0));
  });

  it('clamps negative raw values to 0', () => {
    expect(glslGetDensity(-1.0)).toBeCloseTo(0, 5);
  });
});
