/// <reference types="react" />

type FluidAlgorithm = 'standard' | 'glass' | 'ink' | 'aurora' | 'ripple';

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
  waterColor: [number, number, number];
  glowColor: [number, number, number];
  algorithm: FluidAlgorithm;
  warpStrength: number;
}

type PresetKey = 'calm' | 'storm' | 'wave' | 'neon' | 'smoke';

interface FluidHandle {
  reset(): void;
  move(opts: { x: number; y: number; strength?: number }): void;
  splat(x: number, y: number, vx: number, vy: number, strength?: number): void;
  updateConfig(config: Partial<FluidConfig>): void;
}

interface FluidBaseProps {
  className?: string;
  style?: React.CSSProperties;
  config?: Partial<FluidConfig>;
  isMouseEnabled?: boolean;
  isWorkerEnabled?: boolean;
  preset?: PresetKey;
  algorithm?: FluidAlgorithm;
  backgroundColor?: string;
  backgroundSrc?: string;
  backgroundSize?: string | number;
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
