import type { CSSProperties, ForwardRefExoticComponent, RefAttributes } from 'react';

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
export interface FluidHandle {
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

  /** Merges a partial config update into the running simulation. */
  updateConfig(config: Partial<FluidConfig>): void;
}

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

interface FluidBaseProps {
  /** Additional CSS class applied to the `<canvas>` element. */
  className?: string;
  /** Inline styles merged with the default `display:block; width:100%; height:100%`. */
  style?: CSSProperties;
  /** Simulation configuration overrides. */
  config?: Partial<FluidConfig>;
  /**
   * When `true` (default), mouse/touch events on the canvas are wired up automatically.
   * Set to `false` and use `ref.updateLocation()` for custom event handling.
   */
  useMouse?: boolean;
  /**
   * When `true` (default), the simulation runs in a Web Worker via OffscreenCanvas.
   * Set to `false` for main-thread mode (required when using multiple instances).
   */
  worker?: boolean;
  /**
   * Apply a named preset as the base configuration.
   * Any `config` values you provide override the preset.
   */
  preset?: PresetKey;
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
   * Default: 0.4
   */
  effect?: number;
  /**
   * How the image is sized within the canvas.
   * Accepts: 'cover' | 'contain' | '50%' | '200px' | number (scale factor).
   * Default: 'cover'
   */
  imageSize?: string | number;
  /**
   * CSS background colour applied to the container div behind the canvas.
   * Visible when the image does not fill the full canvas (e.g. imageSize='50%').
   * Default: '#0a0a0a'
   */
  backgroundColor?: string;
}

export const FluidImage: ForwardRefExoticComponent<FluidImageProps & RefAttributes<FluidHandle>>;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Low-level hook that creates a FluidController inside a container element.
 *
 * The hook creates a `<canvas>` element programmatically on every mount and
 * appends it to the container. This ensures React StrictMode's double-invoke
 * pattern never reuses a neutered canvas (OffscreenCanvas transfer is
 * irreversible). The canvas is removed on unmount.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const controllerRef = useFluid(containerRef, { worker: false });
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
  opts?: { worker?: boolean; config?: Partial<FluidConfig> }
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

  handleMove(x: number, y: number, strength?: number): void;

  resize(width?: number, height?: number): void;
  updateConfig(config: Partial<FluidConfig>): void;

  start(): void;
  stop(): void;
  destroy(): void;

  readonly isRunning: boolean;
}

/** Unified controller abstracting worker vs main-thread execution. */
export class FluidController {
  constructor(
    canvas: HTMLCanvasElement,
    opts?: { worker?: boolean; config?: Partial<FluidConfig> }
  );

  setTextSource(opts: TextSourceOpts): void;
  setImageSource(src: string, effect?: number, size?: string | number): void;

  handleMove(x: number, y: number, strength?: number): void;
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
