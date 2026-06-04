/// <reference types="react" />

type FluidAlgorithm = 'standard' | 'glass' | 'ink' | 'aurora' | 'ripple';

/** RGB tuple (values 0–1) or a CSS hex string (#RGB, #RRGGBB, #RRGGBBAA — alpha stripped). */
type FluidColor = [number, number, number] | `#${string}` | string;

/** Internal quality object used by FluidController and FluidSimulation. */
interface FluidQuality {
  dpr?: number;
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

/**
 * All FluidConfig fields are inherited as optional props.
 * Set any simulation knob directly on the component — no config object needed.
 */
interface FluidBaseProps extends Partial<FluidConfig> {
  /** Applied to the canvas container element. */
  className?: string;
  /** Applied to the canvas container element. */
  style?: React.CSSProperties;
  /** Canvas backing resolution as a fraction of devicePixelRatio. Range [0.1, 1]. Default 1 (native DPR). */
  pixelRatio?: number;
  /** Simulation FBO size as a fraction of canvas size. Range [0.1, 1]. Default 0.5. */
  simResolution?: number;
  preset?: PresetKey;
  backgroundColor?: string;
  backgroundSrc?: string;
  backgroundSize?: string | number;
  /** Forward pointer events to the simulation. Default true. */
  mouseEnabled?: boolean;
  /** Run simulation in a Web Worker via OffscreenCanvas. Default true. */
  workerEnabled?: boolean;
  /** Prefer WebGPU renderer; falls back to WebGL. Default true. */
  webGPUEnabled?: boolean;
  /** Enable transparent canvas. Default true. Set false for a minor perf gain when transparency is not needed. */
  alphaEnabled?: boolean;
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
