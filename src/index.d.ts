/// <reference path="./globals.d.ts" />

export declare const FluidText: React.ForwardRefExoticComponent<FluidTextProps & React.RefAttributes<FluidHandle>>;
export declare const FluidImage: React.ForwardRefExoticComponent<FluidImageProps & React.RefAttributes<FluidHandle>>;

export declare function useFluid(
  containerRef: React.RefObject<HTMLElement>,
  opts?: { isWorkerEnabled?: boolean; config?: Partial<FluidConfig> }
): React.RefObject<FluidController | null>;

export declare class FluidController {
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

export declare class FluidSimulation {
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

export type DefaultPropsShared = {
  readonly backgroundColor: string;
  readonly backgroundSize: string | number;
  readonly isMouseEnabled: boolean;
  readonly isWorkerEnabled: boolean;
};

export type DefaultPropsImage = DefaultPropsShared & {
  readonly effect: number;
  readonly imageSize: string | number;
};

export type DefaultPropsText = DefaultPropsShared & {
  readonly fontSize: number;
  readonly color: string;
  readonly fontFamily: string;
  readonly fontWeight: string | number;
};

export declare const DEFAULT_CONFIG: FluidConfig;
export declare const DEFAULT_CONFIG_TEXT: FluidConfig;
export declare const DEFAULT_PROPS_SHARED: DefaultPropsShared;
export declare const DEFAULT_PROPS_IMAGE: DefaultPropsImage;
export declare const DEFAULT_PROPS_TEXT: DefaultPropsText;
export declare const PRESETS: Record<PresetKey, Partial<FluidConfig>>;
export declare function mergeConfig(user?: Partial<FluidConfig>, preset?: PresetKey, base?: FluidConfig): FluidConfig;
export declare function loadImageBitmap(src: string): Promise<ImageBitmap>;
