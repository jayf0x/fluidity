import type { CSSProperties, ForwardRefExoticComponent, RefAttributes } from 'react';

// ---------------------------------------------------------------------------
// Algorithm
// ---------------------------------------------------------------------------

/**
 * Named rendering algorithm for the display shader.
 *
 * - `standard` — fluid colour overlay + gentle refraction (default)
 * - `glass`    — strong UV distortion only, no colour, bent-glass look
 * - `ink`      — dense opaque pigment that accumulates and stains
 * - `aurora`   — velocity-field UV warp, liquid-metal / lava-lamp feel
 * - `ripple`   — exaggerated normals + Fresnel rim, still-water surface
 */
export type FluidAlgorithm = 'standard' | 'glass' | 'ink' | 'aurora' | 'ripple';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Full simulation configuration. All values have sensible defaults. */
export interface FluidConfig {
  /** How long density (ink) lingers before fading. Range: 0–1. Default: 0.992 */
  densityDissipation: number;
  /** Viscosity — how quickly velocity decays. Range: 0–1. Default: 0.93 */
  velocityDissipation: number;
  /** Jacobi iterations for the pressure solve. Higher = more accurate but slower. Default: 25 */
  pressureIterations: number;
  /** Vorticity confinement — swirl factor. Higher creates eddies. Default: 0.0001 */
  curl: number;
  /** Brush radius. Default: 0.004 */
  splatRadius: number;
  /** Force with which the brush pushes the liquid. Default: 0.91 */
  splatForce: number;
  /** Optical warping of the background through the fluid. Default: 0.25 */
  refraction: number;
  /** Specular highlight exponent (lower = broader "paint" look). Default: 1.01 */
  specularExp: number;
  /** Highlight intensity. Default: 0.01 */
  shine: number;
  /** Base fluid colour [R, G, B] in 0–1 range. Default: [0, 0, 0] */
  waterColor: [number, number, number];
  /** Glossy reflection / glow colour [R, G, B]. Default: [0.7, 0.85, 1.0] */
  glowColor: [number, number, number];
  /**
   * Display rendering algorithm. Each algorithm has a distinct visual character.
   * Default: 'standard'
   */
  algorithm: FluidAlgorithm;
  /**
   * UV warp intensity for the `aurora` algorithm.
   * Controls how far velocity displaces background pixels. Default: 0.015
   */
  warpStrength: number;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export type PresetKey = 'calm' | 'storm' | 'wave' | 'neon' | 'smoke';

/** Named preset configurations bundled with the library. */
export const PRESETS: Record<PresetKey, Partial<FluidConfig>>;

// ---------------------------------------------------------------------------
// Imperative handle (ref)
// ---------------------------------------------------------------------------

/** Methods exposed by FluidText and FluidImage via a forwarded ref. */
export interface FluidHandle extends Element {
  /**
   * Fully re-initialises the simulation and reloads the source.
   * Use when you want a clean restart (e.g. after changing the src prop externally).
   */
  reset(): void;

  /**
   * Programmatic pointer input — e.g. from a custom mousemove handler.
   * Coordinates are relative to the canvas element.
   */
  updateLocation(opts: { x: number; y: number; strength?: number }): void;

  /**
   * Immediately injects one fluid splat at pixel position (x, y) with an
   * explicit velocity vector (vx, vy) in canvas-pixel units.
   * Safe to call multiple times per frame — each call writes directly to the
   * velocity and density FBOs without going through the mouse-state machine.
   *
   * Ideal for programmatic paths (particle systems, Lorenz attractors, etc.)
   * where you need N independent injection points per frame.
   *
   * @param x     Canvas-relative pixel X
   * @param y     Canvas-relative pixel Y
   * @param vx    Horizontal velocity (positive = right)
   * @param vy    Vertical velocity (positive = down)
   * @param strength  Force multiplier. Default: 1
   */
  splat(x: number, y: number, vx: number, vy: number, strength?: number): void;

  /** Merges a partial config update into the running simulation. */
  updateConfig(config: Partial<FluidConfig>): void;
}

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

/**
 * Boolean props follow the `is`/`has`/`can` naming convention.
 */
interface FluidBaseProps {
  /** Additional CSS class applied to the container element. */
  className?: string;
  /** Inline styles merged with the default `display:block; width:100%; height:100%`. */
  style?: CSSProperties;
  /** Simulation configuration overrides. */
  config?: Partial<FluidConfig>;
  /**
   * When `true` (default), mouse/touch events on the canvas are wired up automatically.
   * Set to `false` and use `ref.updateLocation()` for custom event handling.
   */
  isMouseEnabled?: boolean;
  /**
   * When `true` (default), the simulation runs in a Web Worker via OffscreenCanvas.
   * Set to `false` for main-thread mode (required when using multiple instances).
   */
  isWorkerEnabled?: boolean;
  /**
   * Apply a named preset as the base configuration.
   * Any `config` values you provide override the preset.
   */
  preset?: PresetKey;
  /**
   * Rendering algorithm that controls the visual character of the fluid effect.
   * Default: 'standard'
   */
  algorithm?: FluidAlgorithm;
  /**
   * CSS background colour applied to the container div behind the WebGL canvas.
   * Visible through transparent canvas areas (e.g. empty space in FluidText,
   * or around a partial-coverage image). Default: '#0a0a0a'
   */
  backgroundColor?: string;
  /**
   * URL or local path to an image composited as the canvas background,
   * behind the text or main image. Accepts any fetchable URL or relative path.
   */
  backgroundSrc?: string;
  /**
   * Sizing mode for `backgroundSrc`. Accepts: 'cover' | 'contain' | '50%' | '200px' | number.
   * Default: 'cover'
   */
  backgroundSize?: string | number;
}

// ---------------------------------------------------------------------------
// FluidText
// ---------------------------------------------------------------------------

export interface FluidTextProps extends FluidBaseProps {
  /** The string to render. Changes trigger a texture rebuild. */
  text: string;
  /** Font size in pixels. Default: 100 */
  fontSize?: number;
  /** CSS colour string for the text. Default: '#ffffff' */
  color?: string;
  /** Font family. Default: 'sans-serif' */
  fontFamily?: string;
  /** Font weight. Default: 900 */
  fontWeight?: string | number;
}

export const FluidText: ForwardRefExoticComponent<FluidTextProps & RefAttributes<FluidHandle>>;

// ---------------------------------------------------------------------------
// FluidImage
// ---------------------------------------------------------------------------

export interface FluidImageProps extends FluidBaseProps {
  /** URL of the image to display. Changing the URL reloads and re-initialises. */
  src: string;
  /**
   * Obstacle brightness (0–1) controlling how strongly the image edges
   * repel the fluid. Lower = weaker boundary, higher = stronger.
   * Default: 0.0
   */
  effect?: number;
  /**
   * How the image is sized within the canvas.
   * Accepts: 'cover' | 'contain' | '50%' | '200px' | number (scale factor).
   * Default: 'cover'
   */
  imageSize?: string | number;
}

export const FluidImage: ForwardRefExoticComponent<FluidImageProps & RefAttributes<FluidHandle>>;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Low-level hook that creates a FluidController inside a container element.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const controllerRef = useFluid(containerRef, { isWorkerEnabled: false });
 *
 * useEffect(() => {
 *   controllerRef.current?.setTextSource({ text: 'Hello', fontSize: 80, color: '#fff' });
 * }, []);
 *
 * return <div ref={containerRef} style={{ width: 400, height: 200 }} />;
 * ```
 */
export function useFluid(
  containerRef: React.RefObject<HTMLElement>,
  opts?: { isWorkerEnabled?: boolean; config?: Partial<FluidConfig> }
): React.RefObject<FluidController | null>;

// ---------------------------------------------------------------------------
// Core classes (framework-agnostic)
// ---------------------------------------------------------------------------

export interface TextSourceOpts {
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
}

/** Low-level WebGL fluid simulation. Accepts HTMLCanvasElement or OffscreenCanvas. */
export class FluidSimulation {
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, config?: Partial<FluidConfig>);

  setTextSource(opts: TextSourceOpts): void;
  setImageSource(src: string, effect?: number, size?: string | number): Promise<void>;
  setImageBitmap(bitmap: ImageBitmap, effect?: number, size?: string | number): void;
  setBackground(bitmap: ImageBitmap | null, size?: string | number): void;

  handleMove(x: number, y: number, strength?: number): void;
  splat(x: number, y: number, vx: number, vy: number, strength?: number): void;

  resize(width?: number, height?: number): void;
  updateConfig(config: Partial<FluidConfig>): void;

  start(): void;
  stop(): void;
  destroy(): void;

  readonly isRunning: boolean;
}

/** Unified controller abstracting worker vs main-thread execution. */
export class FluidController {
  constructor(canvas: HTMLCanvasElement, opts?: { isWorkerEnabled?: boolean; config?: Partial<FluidConfig> });

  setTextSource(opts: TextSourceOpts): void;
  setImageSource(src: string, effect?: number, size?: string | number): void;
  setBackground(bitmap: ImageBitmap | null, size?: string | number): void;

  handleMove(x: number, y: number, strength?: number): void;
  splat(x: number, y: number, vx: number, vy: number, strength?: number): void;
  resize(width: number, height: number): void;
  updateConfig(config: Partial<FluidConfig>): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Config utilities
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: FluidConfig;

/** Merges user config with defaults, optionally layering a named preset. */
export function mergeConfig(user?: Partial<FluidConfig>, preset?: PresetKey): FluidConfig;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and returns an ImageBitmap.
 * Works on both main thread and in workers.
 */
export function loadImageBitmap(src: string): Promise<ImageBitmap>;
