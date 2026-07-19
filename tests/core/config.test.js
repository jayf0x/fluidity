import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, PROP_RANGES, mergeConfig, normalizeConfig, parseColor } from '../../src/core/config.ts';

describe('DEFAULT_CONFIG', () => {
  it('has all required keys', () => {
    const keys = [
      'densityDissipation',
      'velocityDissipation',
      'pressureIterations',
      'curl',
      'splatRadius',
      'splatForce',
      'refraction',
      'specularExp',
      'shine',
      'waterColor',
      'glowColor',
    ];
    for (const key of keys) {
      expect(DEFAULT_CONFIG).toHaveProperty(key);
    }
  });

  it('has numeric values for scalar fields', () => {
    expect(typeof DEFAULT_CONFIG.densityDissipation).toBe('number');
    expect(typeof DEFAULT_CONFIG.pressureIterations).toBe('number');
  });

  it('has valid FluidColor values for color fields', () => {
    const isFluidColor = (v) => Array.isArray(v) || (typeof v === 'string' && v.startsWith('#'));
    expect(isFluidColor(DEFAULT_CONFIG.waterColor)).toBe(true);
    expect(isFluidColor(DEFAULT_CONFIG.glowColor)).toBe(true);
  });
});

describe('parseColor', () => {
  it('defaults alpha to 1 for opaque 6-digit hex', () => {
    expect(parseColor('#ff0000')).toEqual([1, 0, 0, 1]);
  });

  it('defaults alpha to 1 for 3-digit hex', () => {
    expect(parseColor('#f00')).toEqual([1, 0, 0, 1]);
  });

  it('parses alpha from 8-digit hex (#RRGGBBAA)', () => {
    const [r, g, b, a] = parseColor('#ff000080');
    expect([r, g, b]).toEqual([1, 0, 0]);
    expect(a).toBeCloseTo(128 / 255, 2);
  });

  it('parses alpha from 4-digit hex (#RGBA)', () => {
    const [r, g, b, a] = parseColor('#f008');
    expect([r, g, b]).toEqual([1, 0, 0]);
    expect(a).toBeCloseTo(136 / 255, 2);
  });

  it('defaults alpha to 1 for a 3-element array', () => {
    expect(parseColor([1, 0, 0])).toEqual([1, 0, 0, 1]);
  });

  it('passes through alpha from a 4-element array', () => {
    expect(parseColor([1, 0, 0, 0.5])).toEqual([1, 0, 0, 0.5]);
  });
});

describe('normalizeConfig', () => {
  it('maps densityDissipation: 0 to physics min (0.94)', () => {
    expect(normalizeConfig({ densityDissipation: 0 }).densityDissipation).toBeCloseTo(0.94);
  });

  it('maps densityDissipation: 1 to physics max (1.0)', () => {
    expect(normalizeConfig({ densityDissipation: 1 }).densityDissipation).toBeCloseTo(1.0);
  });

  it('maps densityDissipation: 0.5 to physics midpoint (0.97)', () => {
    expect(normalizeConfig({ densityDissipation: 0.5 }).densityDissipation).toBeCloseTo(0.97);
  });

  it('passes through values > 1 unchanged (raw physics override)', () => {
    expect(normalizeConfig({ densityDissipation: 1.5 }).densityDissipation).toBe(1.5);
  });

  it('passes through values < 0 unchanged (raw physics override)', () => {
    expect(normalizeConfig({ velocityDissipation: -0.5 }).velocityDissipation).toBe(-0.5);
  });

  it('maps shine: 0.5 to physics 0.075', () => {
    expect(normalizeConfig({ shine: 0.5 }).shine).toBeCloseTo(0.075);
  });

  it('leaves fields without a range entry unchanged', () => {
    const result = normalizeConfig({ curl: 0.5, waterColor: '#ff0000' });
    expect(result.curl).toBe(0.5);
    expect(result.waterColor).toBe('#ff0000');
  });

  it('does not mutate the input object', () => {
    const input = { shine: 0.5 };
    normalizeConfig(input);
    expect(input.shine).toBe(0.5);
  });

  it('exports PROP_RANGES with expected keys', () => {
    const keys = ['densityDissipation', 'velocityDissipation', 'splatRadius', 'splatForce', 'specularExp', 'shine', 'warpStrength'];
    for (const key of keys) expect(PROP_RANGES).toHaveProperty(key);
  });
});

describe('mergeConfig', () => {
  it('returns all defaults when called with no argument', () => {
    expect(mergeConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('overrides individual keys', () => {
    const result = mergeConfig({ shine: 0.5, pressureIterations: 10 });
    expect(result.shine).toBe(0.5);
    expect(result.pressureIterations).toBe(10);
    // untouched keys remain as defaults
    expect(result.curl).toBe(DEFAULT_CONFIG.curl);
  });

  it('does not mutate DEFAULT_CONFIG', () => {
    const before = { ...DEFAULT_CONFIG };
    mergeConfig({ shine: 99 });
    expect(DEFAULT_CONFIG).toEqual(before);
  });

  it('accepts a full override object', () => {
    const full = {
      densityDissipation: 0.5,
      velocityDissipation: 0.5,
      pressureIterations: 5,
      curl: 0.1,
      splatRadius: 0.01,
      splatForce: 0.5,
      refraction: 0.1,
      specularExp: 2,
      shine: 0.05,
      waterColor: [1, 0, 0],
      glowColor: [0, 1, 0],
      algorithm: 'standard',
      warpStrength: 0.015,
    };
    expect(mergeConfig(full)).toEqual(full);
  });

  it('accepts partial empty object', () => {
    expect(mergeConfig({})).toEqual(DEFAULT_CONFIG);
  });
});
