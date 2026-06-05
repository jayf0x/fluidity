import { DEFAULT_PROPS_IMAGE } from './core/config';
import { FluidSimulation } from './core/simulation';
import { log } from './utils';
// @ts-ignore — Vite worker import syntax not understood by tsc
import FluidWorker from './worker/index.js?worker&inline';

const WORKER_SUPPORTED = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';

export class FluidController {
  #worker: Worker | null = null;
  #sim: FluidSimulation | null = null;
  #useWorker: boolean;
  #useWebGPU: boolean;
  #enableAlpha: boolean;
  #qualityDpr: number;
  #qualitySim: number;

  // Pending source calls queued while WebGPU async init is in progress (main-thread only)
  #pendingTextSource: TextSourceOpts | null = null;
  #pendingImageSrc: { src: string; effect: number; size: string | number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    {
      workerEnabled = true,
      webGPUEnabled = true,
      alphaEnabled = true,
      quality = {},
      config = {},
    }: {
      workerEnabled?: boolean;
      webGPUEnabled?: boolean;
      alphaEnabled?: boolean;
      quality?: FluidQuality;
      config?: Partial<FluidConfig>;
    } = {}
  ) {
    this.#qualityDpr = Math.max(0.1, Math.min(1, quality.dpr ?? 1));
    this.#qualitySim = Math.max(0.1, Math.min(1, quality.sim ?? 0.5));
    this.#useWebGPU = webGPUEnabled;
    this.#enableAlpha = alphaEnabled;
    this.#useWorker = workerEnabled && WORKER_SUPPORTED;

    if (this.#useWorker) {
      this.#initWorker(canvas, config);
    } else {
      this.#initMainThread(canvas, config);
    }
  }

  // ---------------------------------------------------------------------------
  // Source setters
  // ---------------------------------------------------------------------------

  setTextSource(opts: TextSourceOpts): void {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'setTextSource', opts });
    } else if (this.#sim) {
      this.#sim.setTextSource(opts);
    } else {
      // Sim not yet ready — queue (last-write-wins within a source type)
      this.#pendingTextSource = opts;
      this.#pendingImageSrc = null;
    }
  }

  setImageSource(
    src: string,
    effect = DEFAULT_PROPS_IMAGE.effect,
    size: string | number = DEFAULT_PROPS_IMAGE.imageSize
  ): void {
    if (this.#worker) {
      // Resolve relative URLs before passing to the worker — blob workers have no valid base URL
      const absoluteSrc = new URL(src, location.href).href;
      this.#worker.postMessage({ type: 'setImageSource', src: absoluteSrc, effect, size });
    } else if (this.#sim) {
      this.#sim.setImageSource(src, effect, size);
    } else {
      this.#pendingImageSrc = { src, effect, size };
      this.#pendingTextSource = null;
    }
  }

  setBackground(bitmap: ImageBitmap | null, size: string | number = 'cover'): void {
    if (this.#worker) {
      const transfer = bitmap ? [bitmap] : [];
      this.#worker.postMessage({ type: 'setBackground', bitmap: bitmap ?? null, size }, transfer as Transferable[]);
    } else {
      this.#sim?.setBackground(bitmap ?? null, size);
    }
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  /**
   * Immediately injects one splat at (x, y) with explicit velocity (vx, vy).
   * Safe to call multiple times per frame. See FluidSimulation.splat for details.
   */
  splat(x: number, y: number, vx: number, vy: number, strength = 1): void {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'splat', x, y, vx, vy, strength });
    } else {
      this.#sim!.splat(x, y, vx, vy, strength);
    }
  }

  handleMove(x: number, y: number, strength = 1): void {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'move', x, y, strength });
    } else {
      this.#sim!.handleMove(x, y, strength);
    }
  }

  // ---------------------------------------------------------------------------
  // Config + control
  // ---------------------------------------------------------------------------

  updateQuality(quality: FluidQuality): void {
    this.#qualityDpr = Math.max(0.1, Math.min(1, quality.dpr ?? this.#qualityDpr));
    this.#qualitySim = Math.max(0.1, Math.min(1, quality.sim ?? this.#qualitySim));
    if (this.#worker) {
      this.#worker.postMessage({ type: 'updateQuality', quality: { dpr: this.#qualityDpr, sim: this.#qualitySim } });
    } else {
      this.#sim!.updateQuality(quality);
    }
  }

  updateConfig(config: Partial<FluidConfig>): void {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'updateConfig', config });
    } else {
      this.#sim!.updateConfig(config);
    }
  }

  resize(width: number, height: number): void {
    const effectiveDpr = ((typeof window !== 'undefined' && window.devicePixelRatio) || 1) * this.#qualityDpr;
    if (this.#worker) {
      this.#worker.postMessage({ type: 'resize', width, height, dpr: effectiveDpr });
    } else {
      this.#sim?.resize(width, height, effectiveDpr);
    }
  }

  destroy(): void {
    if (this.#worker) {
      const worker = this.#worker;
      this.#worker = null;
      worker.postMessage({ type: 'destroy' });
      setTimeout(() => worker.terminate(), 50);
    } else {
      this.#sim?.destroy();
      this.#sim = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Main-thread renderer init.
   *
   * When `navigator.gpu` is present we attempt WebGPU asynchronously and
   * queue any source calls that arrive before the init resolves.
   *
   * When `navigator.gpu` is absent we fall back to WebGL synchronously —
   * this is the common path in jsdom/test environments and keeps the
   * constructor behaviour synchronous where possible.
   */
  #initMainThread(canvas: HTMLCanvasElement, config: Partial<FluidConfig>): void {
    const quality = { dpr: this.#qualityDpr, sim: this.#qualitySim };
    const hasGPU = this.#useWebGPU && typeof navigator !== 'undefined' && !!navigator.gpu;

    if (hasGPU) {
      // Async WebGPU-first: source calls arriving before resolve are queued.
      FluidSimulation.create(canvas, config, quality, true, this.#enableAlpha)
        .then((sim) => {
          this.#sim = sim;
          if (this.#pendingTextSource) {
            sim.setTextSource(this.#pendingTextSource);
            this.#pendingTextSource = null;
          } else if (this.#pendingImageSrc) {
            const { src, effect, size } = this.#pendingImageSrc;
            sim.setImageSource(src, effect, size);
            this.#pendingImageSrc = null;
          }
        })
        .catch((err) => {
          log('Renderer init failed:', err);
        });
    } else {
      // Sync WebGL fallback — no queuing needed.
      this.#sim = new FluidSimulation(canvas, config, quality, undefined, this.#enableAlpha);
    }
  }

  #initWorker(canvas: HTMLCanvasElement, config: Partial<FluidConfig>): void {
    const dpr = ((typeof window !== 'undefined' && window.devicePixelRatio) || 1) * this.#qualityDpr;
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    canvas.width = width;
    canvas.height = height;

    let offscreen: OffscreenCanvas;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch {
      log(
        'OffscreenCanvas transfer failed — falling back to main-thread mode. ' +
          'This is expected in React StrictMode development.'
      );
      this.#useWorker = false;
      this.#initMainThread(canvas, config);
      return;
    }

    const worker = (this.#worker = new FluidWorker());
    worker.onerror = (e: ErrorEvent) => log('Worker error:', e.message);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'error') {
        log('Simulation error:', e.data.message);
      }
    };

    worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width,
        height,
        config,
        dpr,
        quality: { dpr: this.#qualityDpr, sim: this.#qualitySim },
        useWebGPU: this.#useWebGPU,
        enableAlpha: this.#enableAlpha,
      },
      [offscreen]
    );
  }
}
