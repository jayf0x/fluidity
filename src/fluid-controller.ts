import { DEFAULT_PROPS } from './core/config';
import { FluidSimulation } from './core/simulation';
// @ts-ignore — Vite worker import syntax not understood by tsc
import FluidWorker from './worker/index.js?worker&inline';

const WORKER_SUPPORTED = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';

export class FluidController {
  #worker: Worker | null = null;
  #sim: FluidSimulation | null = null;
  #useWorker: boolean;
  #canvas: HTMLCanvasElement;

  constructor(
    canvas: HTMLCanvasElement,
    { isWorkerEnabled = true, config = {} }: { isWorkerEnabled?: boolean; config?: Partial<FluidConfig> } = {}
  ) {
    this.#canvas = canvas;
    this.#useWorker = isWorkerEnabled && WORKER_SUPPORTED;

    if (this.#useWorker) {
      this.#initWorker(canvas, config);
    } else {
      this.#sim = new FluidSimulation(canvas, config);
    }
  }

  // ---------------------------------------------------------------------------
  // Source setters
  // ---------------------------------------------------------------------------

  setTextSource(opts: TextSourceOpts): void {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'setTextSource', opts });
    } else {
      this.#sim!.setTextSource(opts);
    }
  }

  setImageSource(src: string, effect = DEFAULT_PROPS.effect, size: string | number = DEFAULT_PROPS.imageSize): void {
    if (this.#worker) {
      // Resolve relative URLs before passing to the worker — blob workers have no valid base URL
      const absoluteSrc = new URL(src, location.href).href;
      this.#worker.postMessage({ type: 'setImageSource', src: absoluteSrc, effect, size });
    } else {
      this.#sim!.setImageSource(src, effect, size);
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

  updateConfig(config: Partial<FluidConfig>): void {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'updateConfig', config });
    } else {
      this.#sim!.updateConfig(config);
    }
  }

  resize(width: number, height: number): void {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'resize', width, height });
    } else {
      this.#sim!.resize(width, height);
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

  #initWorker(canvas: HTMLCanvasElement, config: Partial<FluidConfig>): void {
    const { clientWidth: width, clientHeight: height } = canvas;

    let offscreen: OffscreenCanvas;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch {
      console.warn(
        '[fluidity-js] OffscreenCanvas transfer failed — falling back to main-thread mode. ' +
          'This is expected in React StrictMode development.'
      );
      this.#useWorker = false;
      this.#sim = new FluidSimulation(canvas, config);
      return;
    }

    const worker = (this.#worker = new FluidWorker());
    worker.onerror = (e: ErrorEvent) => {
      console.error('[fluidity-js] Worker error:', e.message);
    };
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'error') {
        console.error('[fluidity-js] Simulation error:', e.data.message);
      }
    };

    worker.postMessage({ type: 'init', canvas: offscreen, width, height, config }, [offscreen]);
  }
}
