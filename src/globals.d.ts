/// <reference types="react" />

type FluidAlgorithm = 'standard' | 'glass' | 'ink' | 'aurora' | 'ripple';

/** RGB tuple (values 0–1) or a CSS hex string (#RGB, #RRGGBB, #RRGGBBAA — alpha stripped). */
type FluidColor = [number, number, number] | `#${string}`;

/**
 * Granular performance/quality controls. Both axes are independent — you can
 * run a sharp display at a coarser simulation, or vice versa.
 * Reactive: changes after mount are applied on the next animation frame.
 */
interface FluidQuality {
  /** devicePixelRatio multiplier for canvas backing resolution. Range [0.1, 1]. Default 1 (native). On Retina, 0.5 → 1× pixels (75% less fill). */
  dpr?: number;
  /** Simulation FBO size as a fraction of canvas size. Range [0.1, 1]. Default 0.5 (current behavior). Higher = more fluid detail, more GPU. */
  sim?: number;
}

interface FluidConfig {
  densityDissipation: number;
  velocityDissipation: number;
  pressureIterations: number;
  curl: number;
  splatRadius: number;
  splatForce: number;
  refraction: number;
  specularExp: number;
  shine: number;
  waterColor: FluidColor;
  glowColor: FluidColor;
  algorithm: FluidAlgorithm;
  warpStrength: number;
}

type PresetKey = 'calm' | 'sand' | 'wave' | 'neon' | 'smoke';

interface FluidHandle {
  reset(): void;
  move(x: number, y: number, strength?: number): void;
  splat(x: number, y: number, velocityX: number, velocityY: number, strength?: number): void;
  updateConfig(config: Partial<FluidConfig>): void;
}

interface FluidBaseProps {
  /** Will apply to canvas container */
  className?: string;
  /** Will apply to canvas container */
  style?: React.CSSProperties;
  // FluidConfig fields — all optional, override the base config or preset
  densityDissipation?: number;
  velocityDissipation?: number;
  pressureIterations?: number;
  curl?: number;
  splatRadius?: number;
  splatForce?: number;
  refraction?: number;
  specularExp?: number;
  shine?: number;
  waterColor?: FluidColor;
  glowColor?: FluidColor;
  algorithm?: FluidAlgorithm;
  warpStrength?: number;
  // Quality — canvas resolution (dpr) and simulation resolution (sim)
  /** devicePixelRatio multiplier for canvas backing resolution. Range [0.1, 1]. Default 1. */
  dpr?: number;
  /** Simulation FBO size as fraction of canvas size. Range [0.1, 1]. Default 0.5. */
  sim?: number;
  isMouseEnabled?: boolean;
  isWorkerEnabled?: boolean;
  preset?: PresetKey;
  backgroundColor?: string;
  backgroundSrc?: string;
  backgroundSize?: string | number;
  /** Enable WebGPU renderer (default true, falls back to WebGL). */
  useWebGPU?: boolean;
  /** Enable transparent canvas (default true). Set false for a minor perf gain when transparency is not needed. */
  enableAlpha?: boolean;
}

interface FluidTextProps extends FluidBaseProps {
  text: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string | number;
}

interface FluidImageProps extends FluidBaseProps {
  src: string;
  effect?: number;
  imageSize?: string | number;
}

interface TextSourceOpts {
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
}
