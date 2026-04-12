'use strict';

/** @type {import('../../types/index.d.ts').FluidConfig} */
export const DEFAULT_CONFIG = {
  densityDissipation: 0.992,
  velocityDissipation: 0.93,
  pressureIterations: 25,
  curl: 0.0001,
  splatRadius: 0.004,
  splatForce: 0.91,
  refraction: 0.25,
  specularExp: 1.01,
  shine: 0.01,
  waterColor: [0.0, 0.0, 0.0],
  glowColor: [0.7, 0.85, 1.0],
};

/**
 * Merges user-provided config with defaults.
 * Accepts camelCase keys matching the FluidConfig interface.
 * @param {Partial<import('../../types/index.d.ts').FluidConfig>} [user]
 * @returns {import('../../types/index.d.ts').FluidConfig}
 */
export function mergeConfig(user = {}) {
  return { ...DEFAULT_CONFIG, ...user };
}
