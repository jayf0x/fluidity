import type { FluidAlgorithm, FluidConfig, PresetKey } from '../../types/index.js';

export const DEFAULT_CONFIG: FluidConfig = {
  densityDissipation: 0.992,
  velocityDissipation: 0.93,
  pressureIterations: 1,
  curl: 0.0001,
  splatRadius: 0.004,
  splatForce: 0.91,
  refraction: 0.25,
  specularExp: 1.01,
  shine: 0.01,
  waterColor: [0.0, 0.0, 0.0],
  glowColor: [0.7, 0.85, 1.0],
  algorithm: 'standard' as FluidAlgorithm,
  warpStrength: 0.015,
};

export const PRESETS: Record<PresetKey, Partial<FluidConfig>> = {
  calm: {
    densityDissipation: 0.999,
    velocityDissipation: 0.98,
    curl: 0.0001,
    splatRadius: 0.003,
    splatForce: 0.5,
    refraction: 0.15,
    shine: 0.005,
    glowColor: [0.6, 0.85, 1.0],
    waterColor: [0, 0.02, 0.05],
  },
  storm: {
    densityDissipation: 0.97,
    velocityDissipation: 0.88,
    curl: 0.45,
    splatRadius: 0.012,
    splatForce: 3.0,
    refraction: 0.6,
    shine: 0.08,
    glowColor: [0.2, 0.3, 0.8],
    waterColor: [0, 0, 0.1],
    pressureIterations: 150,
  },
  wave: {
    densityDissipation: 0.994,
    velocityDissipation: 0.92,
    curl: 0.2,
    splatRadius: 0.005,
    splatForce: 1.2,
    refraction: 0.35,
    shine: 0.03,
    pressureIterations: 5,
    glowColor: [0.5, 0.8, 1.0],
    waterColor: [0, 0.01, 0.03],
  },
  neon: {
    densityDissipation: 0.985,
    velocityDissipation: 0.93,
    curl: 0.05,
    splatRadius: 0.008,
    splatForce: 1.5,
    refraction: 0.25,
    specularExp: 0.5,
    shine: 0.14,
    glowColor: [1, 0.2, 0.8],
    waterColor: [0.05, 0, 0.08],
  },
  smoke: {
    densityDissipation: 0.996,
    velocityDissipation: 0.97,
    curl: 0.04,
    splatRadius: 0.009,
    splatForce: 0.8,
    refraction: 0.08,
    shine: 0,
    glowColor: [0.5, 0.5, 0.5],
    waterColor: [0.06, 0.06, 0.06],
  },
};

/**
 * Merges user-provided config with defaults, optionally layering a named preset.
 * Preset values take precedence over defaults; user values take precedence over preset.
 */
export function mergeConfig(user: Partial<FluidConfig> = {}, preset?: PresetKey): FluidConfig {
  const base = preset ? { ...DEFAULT_CONFIG, ...PRESETS[preset] } : DEFAULT_CONFIG;
  return { ...base, ...user };
}
