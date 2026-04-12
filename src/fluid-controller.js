'use strict';

/**
 * FluidController — uniform API over two execution strategies:
 *
 *   Worker mode (default):  simulation runs in a dedicated Web Worker on an
 *     OffscreenCanvas, fully off the main thread. Requires browser support for
 *     OffscreenCanvas + Workers. If unavailable, falls back automatically.
 *
 *   Main-thread mode (worker=false): simulation runs synchronously on the main
 *     thread via requestAnimationFrame. Use this when you need multiple
 *     simultaneous instances (multiple WebGL workers can freeze the UI).
 *
 * Import note: the worker is bundled inline by Vite at library build time,
 * so consumers do not need any extra bundler config.
 */

import { FluidSimulation } from './core/simulation.js';
// ?worker&inline tells Vite to bundle the worker and inline it as a blob URL.
// The resulting import is a Worker constructor — no URL configuration needed.
import FluidWorker from './worker/index.js?worker&inline';

const WORKER_SUPPORTED =
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';

export class FluidController {
  #worker = null;
  #sim = null;
  #useWorker;
  #canvas;

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts]
   * @param {boolean} [opts.worker=true]
   * @param {Partial<import('../types/index.d.ts').FluidConfig>} [opts.config]
   */
  constructor(canvas, { worker: useWorker = true, config = {} } = {}) {
    this.#canvas = canvas;
    this.#useWorker = useWorker && WORKER_SUPPORTED;

    if (this.#useWorker) {
      this.#initWorker(canvas, config);
    } else {
      this.#sim = new FluidSimulation(canvas, config);
    }
  }

  // -------------------------------------------------------------------------
  // Source setters
  // -------------------------------------------------------------------------

  /**
   * @param {{ text: string, fontSize: number, color: string, fontFamily?: string, fontWeight?: string | number }} opts
   */
  setTextSource(opts) {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'setTextSource', opts });
    } else {
      this.#sim.setTextSource(opts);
    }
  }

  /**
   * @param {string} src
   * @param {number} [effect=0.4]
   * @param {string | number} [size='cover']
   */
  setImageSource(src, effect = 0.4, size = 'cover') {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'setImageSource', src, effect, size });
    } else {
      this.#sim.setImageSource(src, effect, size);
    }
  }

  // -------------------------------------------------------------------------
  // Interaction
  // -------------------------------------------------------------------------

  /**
   * @param {number} x - canvas-relative x coordinate
   * @param {number} y - canvas-relative y coordinate
   * @param {number} [strength=1]
   */
  handleMove(x, y, strength = 1) {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'move', x, y, strength });
    } else {
      this.#sim.handleMove(x, y, strength);
    }
  }

  // -------------------------------------------------------------------------
  // Config + control
  // -------------------------------------------------------------------------

  /** @param {Partial<import('../types/index.d.ts').FluidConfig>} config */
  updateConfig(config) {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'updateConfig', config });
    } else {
      this.#sim.updateConfig(config);
    }
  }

  /**
   * Notifies the simulation that the canvas has been resized.
   * Call this from a ResizeObserver callback.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'resize', width, height });
    } else {
      this.#sim.resize(width, height);
    }
  }

  /** Tears down all GPU resources and terminates the worker (if any). */
  destroy() {
    if (this.#worker) {
      const worker = this.#worker;
      this.#worker = null; // null first so no further messages are routed
      worker.postMessage({ type: 'destroy' });
      // Give the worker a tick to clean up before hard-terminating
      setTimeout(() => worker.terminate(), 50);
    } else {
      this.#sim?.destroy();
      this.#sim = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  #initWorker(canvas, config) {
    const { clientWidth: width, clientHeight: height } = canvas;

    let offscreen;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch {
      // Canvas control already transferred (e.g. React StrictMode double-mount).
      // Fall back gracefully to main-thread simulation.
      console.warn(
        '[fluidity-js] OffscreenCanvas transfer failed — falling back to main-thread mode. ' +
        'This is expected in React StrictMode development.'
      );
      this.#useWorker = false;
      this.#sim = new FluidSimulation(canvas, config);
      return;
    }

    this.#worker = new FluidWorker();
    this.#worker.onerror = (e) => {
      console.error('[fluidity-js] Worker error:', e.message);
    };
    this.#worker.onmessage = (e) => {
      if (e.data.type === 'error') {
        console.error('[fluidity-js] Simulation error:', e.data.message);
      }
    };

    this.#worker.postMessage(
      { type: 'init', canvas: offscreen, width, height, config },
      [offscreen]
    );
  }
}
