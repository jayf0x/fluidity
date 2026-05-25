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
  waterColor: '#000000',
  glowColor: '#b3d9ff',
  algorithm: 'standard' as FluidAlgorithm,
  warpStrength: 0.015,
};

export const DEFAULT_CONFIG_TEXT: FluidConfig = {
  ...DEFAULT_CONFIG,
  densityDissipation: 0.99,
  velocityDissipation: 0.98,
  pressureIterations: 3,
  curl: 0.15,
  splatRadius: 0.01,
  splatForce: 3,
  refraction: 0.25,
  specularExp: 1,
  shine: 0.1,
  glowColor: '#0080ff',
};

export const DEFAULT_QUALITY: FluidQuality = { dpr: 1, sim: 0.5 };

export const DEFAULT_PROPS_SHARED = {
  backgroundColor: '#0a0a0a',
  backgroundSize: 'cover' as string | number,
  isMouseEnabled: true,
  isWorkerEnabled: true,
  quality: DEFAULT_QUALITY,
} as const;

export const DEFAULT_PROPS_IMAGE = {
  ...DEFAULT_PROPS_SHARED,
  effect: 0 as number,
  imageSize: 'cover' as string | number,
} as const;

export const DEFAULT_PROPS_TEXT = {
  ...DEFAULT_PROPS_SHARED,
  fontSize: 100,
  color: '#ffffff',
  fontFamily: 'sans-serif',
  fontWeight: 900 as string | number,
} as const;

export const PRESETS: Record<PresetKey, Partial<FluidConfig>> = {
  calm: {
    densityDissipation: 0.999,
    velocityDissipation: 0.98,
    curl: 0.0001,
    splatRadius: 0.003,
    splatForce: 0.5,
    refraction: 0.15,
    shine: 0.005,
    glowColor: '#99d9ff',
    waterColor: '#00050d',
  },
  sand: {
    densityDissipation: 0.997,
    velocityDissipation: 0.98,
    curl: 1,
    splatRadius: 0.01,
    splatForce: 0.9,
    refraction: 0.8,
    specularExp: 0.1,
    shine: 0.05,
    glowColor: '#070707',
    waterColor: '#735420',
  },
  wave: {
    densityDissipation: 0.994,
    velocityDissipation: 0.92,
    curl: 0.2,
    splatRadius: 0.005,
    splatForce: 1.2,
    refraction: 0.35,
    shine: 0.03,
    glowColor: '#80ccff',
    waterColor: '#000308',
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
    glowColor: '#ff33cc',
    waterColor: '#0d0014',
  },
  smoke: {
    densityDissipation: 0.996,
    velocityDissipation: 0.97,
    curl: 0.04,
    splatRadius: 0.009,
    splatForce: 0.8,
    refraction: 0.08,
    shine: 0,
    glowColor: '#808080',
    waterColor: '#0f0f0f',
  },
};

/** Normalise a FluidColor to an RGB tuple with values in [0, 1]. */
export function parseColor(color: FluidColor): [number, number, number] {
  if (Array.isArray(color)) return color;
  // Strip leading '#', take at most 6 hex chars (drops alpha if present)
  const hex = (color as string).slice(1, 7);
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16) / 255,
      parseInt(hex[1] + hex[1], 16) / 255,
      parseInt(hex[2] + hex[2], 16) / 255,
    ];
  }
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

export function mergeConfig(
  user: Partial<FluidConfig> = {},
  preset?: PresetKey,
  base: FluidConfig = DEFAULT_CONFIG
): FluidConfig {
  const baseWithPreset = preset ? { ...base, ...PRESETS[preset] } : base;
  return { ...baseWithPreset, ...user };
}
