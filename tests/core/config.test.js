import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, mergeConfig } from '../../src/core/config.js';

describe('DEFAULT_CONFIG', () => {
  it('has all required keys', () => {
    const keys = [
      'densityDissipation', 'velocityDissipation', 'pressureIterations',
      'curl', 'splatRadius', 'splatForce', 'refraction', 'specularExp',
      'shine', 'waterColor', 'glowColor',
    ];
    for (const key of keys) {
      expect(DEFAULT_CONFIG).toHaveProperty(key);
    }
  });

  it('has numeric values for scalar fields', () => {
    expect(typeof DEFAULT_CONFIG.densityDissipation).toBe('number');
    expect(typeof DEFAULT_CONFIG.pressureIterations).toBe('number');
  });

  it('has RGB arrays of length 3 for color fields', () => {
    expect(Array.isArray(DEFAULT_CONFIG.waterColor)).toBe(true);
    expect(DEFAULT_CONFIG.waterColor).toHaveLength(3);
    expect(Array.isArray(DEFAULT_CONFIG.glowColor)).toBe(true);
    expect(DEFAULT_CONFIG.glowColor).toHaveLength(3);
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
    };
    expect(mergeConfig(full)).toEqual(full);
  });

  it('accepts partial empty object', () => {
    expect(mergeConfig({})).toEqual(DEFAULT_CONFIG);
  });
});
