/// <reference types="react" />

type FluidAlgorithm = 'standard' | 'glass' | 'ink' | 'aurora' | 'ripple';

/**
 * RGB(A) tuple (values 0–1) or a CSS hex string (#RGB, #RGBA, #RRGGBB, #RRGGBBAA).
 * Alpha is honored on `waterColor` only — it lets the page/background show through
 * the fluid body regardless of density/coverage. Ignored on `glowColor` (additive
 * highlight, has no fill to blend). Omitted alpha defaults to fully opaque (1).
 */
type FluidColor = [number, number, number] | [number, number, number, number] | `#${string}` | string;

/** Internal quality object used by FluidController and FluidSimulation. */
interface FluidQuality {
  dpr?: number;
  sim?: number;
  /** Hard cap on simWidth × simHeight (post-`sim` scale). Keeps extreme aspect ratios
   * (ultra-wide banners, tall hero sections) responsive without a separate per-axis knob —
   * both axes are scaled down together, preserving aspect ratio. Default: uncapped. */
  maxPixels?: number;
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
  /** Caps simWidth × simHeight so extreme aspect ratios (ultra-wide/tall) stay responsive —
   * both sim axes scale down together, preserving aspect ratio. Default: uncapped. */
  simMaxPixels?: number;
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

/**
 * `refraction`/`warpStrength` have no visible effect on text (the obstacle/coverage
 * mask is glyph-shaped, so the background reveal they'd bend collapses back to
 * `uWaterColor` right outside the glyph edge) — omitted here to keep the prop
 * surface honest. They still work fully on `FluidImage`.
 */
interface FluidTextProps extends Omit<FluidBaseProps, 'refraction' | 'warpStrength'> {
  text: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right';
  textQuality?: number;
  /**
   * Edge softness (device px) for the glyph draw. Softens the dark AA fringe on
   * solid-colour text against the black backdrop. Clamped to [0, 2]. Default: 1.
   */
  textBlur?: number;
}

interface FluidImageProps extends FluidBaseProps {
  src: string;
  effect?: number;
  imageSize?: string | number;
  /**
   * 0–1 — how much the image's own luminance drives the physics obstacle. `0` (default)
   * matches prior behaviour: the image is purely decorative, fluid flows unobstructed.
   * `1`: bright pixels fully block flow, dark pixels barely block it at all.
   */
  obstacleStrength?: number;
}

interface TextSourceOpts {
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right';
  textQuality?: number;
  textBlur?: number;
}
