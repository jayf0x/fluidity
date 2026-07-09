/** Physics [min, max] for each prop that accepts a normalized [0, 1] user value. */
export const PROP_RANGES: Partial<Record<keyof FluidConfig, [number, number]>> = {
  densityDissipation:  [0.94,  1.0  ],
  velocityDissipation: [0.9,   0.999],
  splatRadius:         [0.001, 0.04 ],
  splatForce:          [0.1,   5.0  ],
  specularExp:         [0.1,   10   ],
  shine:               [0.0,   0.15 ],
  warpStrength:        [0.001, 0.1  ],
};

/**
 * Converts normalized [0, 1] prop values to physics values using PROP_RANGES.
 * Values outside [0, 1] pass through unchanged — raw physics override for power users.
 * Props without a PROP_RANGES entry are returned as-is.
 */
export function normalizeConfig(config: Partial<FluidConfig>): Partial<FluidConfig> {
  const out: Partial<FluidConfig> = { ...config };
  for (const [key, [min, max]] of Object.entries(PROP_RANGES) as [keyof FluidConfig, [number, number]][]) {
    const val = config[key] as number | undefined;
    if (val === undefined) continue;
    if (val >= 0 && val <= 1) {
      (out as Record<string, number>)[key] = min + (max - min) * val;
    }
  }
  return out;
}

// All simulation defaults below are stored in normalized [0, 1] space for the
// fields listed in PROP_RANGES. normalizeConfig converts them to physics values
// before the simulation receives them.
export const DEFAULT_CONFIG: FluidConfig = {
  densityDissipation: 0.83,
  velocityDissipation: 0.91,
  pressureIterations: 1,
  curl: 0.0,
  splatRadius: 0.1,
  splatForce: 0.08,
  refraction: 1.0,
  specularExp: 0,
  shine: 0.0,
  waterColor: '#000000',
  glowColor: '#b3d9ff',
  algorithm: 'aurora' as FluidAlgorithm,
  warpStrength: 0.04,
};

export const DEFAULT_CONFIG_TEXT: FluidConfig = {
  ...DEFAULT_CONFIG,
  densityDissipation: 0.9,
  velocityDissipation: 0.9,
  pressureIterations: 3,
  curl: 0.2,
  splatRadius: 0.2,
  splatForce: 0.5,
  refraction: 0.2,
  specularExp: 0.01,
  shine: 0.5,
  waterColor: '#090017',
  glowColor: '#b04721',
};

export const DEFAULT_QUALITY: FluidQuality = {
  dpr: typeof window !== 'undefined' ? 1 / (window.devicePixelRatio || 1) : 1,
  sim: 0.5,
};

export const DEFAULT_PROPS_SHARED = {
  backgroundColor: '#0a0a0a',
  backgroundSize: 'cover' as string | number,
  mouseEnabled: true,
  workerEnabled: true,
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
  textAlign: 'center' as 'left' | 'center' | 'right',
  textQuality: 1,
  textBlur: 1,
} as const;

export const PRESETS: Record<PresetKey, Partial<FluidConfig>> = {
  calm: {
    densityDissipation: 0.98,
    velocityDissipation: 0.81,
    curl: 0.0001,
    splatRadius: 0.05,
    splatForce: 0.08,
    refraction: 0.15,
    shine: 0.03,
    glowColor: '#99d9ff',
    waterColor: '#00050d',
  },
  sand: {
    densityDissipation: 0.95,
    velocityDissipation: 0.81,
    curl: 1,
    splatRadius: 0.23,
    splatForce: 0.16,
    refraction: 0.8,
    specularExp: 0,
    shine: 0.33,
    glowColor: '#070707',
    waterColor: '#735420',
  },
  wave: {
    densityDissipation: 0.90,
    velocityDissipation: 0.20,
    curl: 0.2,
    splatRadius: 0.10,
    splatForce: 0.22,
    refraction: 0.35,
    shine: 0.20,
    glowColor: '#80ccff',
    waterColor: '#000308',
  },
  neon: {
    densityDissipation: 0.75,
    velocityDissipation: 0.30,
    curl: 0.05,
    splatRadius: 0.18,
    splatForce: 0.29,
    refraction: 0.25,
    specularExp: 0.04,
    shine: 0.93,
    glowColor: '#ff33cc',
    waterColor: '#0d0014',
  },
  smoke: {
    densityDissipation: 0.93,
    velocityDissipation: 0.71,
    curl: 0.04,
    splatRadius: 0.21,
    splatForce: 0.14,
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
