/**
 * Fluid simulation Web Worker.
 *
 * Receives an OffscreenCanvas via the 'init' message and runs the simulation
 * entirely off the main thread. All public FluidSimulation methods are
 * exposed as message types.
 *
 * Message types (main → worker):
 *   init       { canvas: OffscreenCanvas, width, height, config }
 *   setTextSource  { opts: TextSourceOpts }
 *   setImageSource { src: string, effect?: number }
 *   setImageBitmap { bitmap: ImageBitmap, effect?: number }  (transferable)
 *   move       { x, y, strength? }
 *   resize     { width, height }
 *   updateConfig { config }
 *   destroy
 *
 * Message types (worker → main):
 *   ready
 *   error      { message }
 */

import { FluidSimulation } from '../core/simulation.js';

let sim = null;

self.onmessage = async (e) => {
  const { type, ...data } = e.data;

  try {
    switch (type) {
      case 'init': {
        const { canvas, width, height, config } = data;
        canvas.width = width;
        canvas.height = height;
        sim = new FluidSimulation(canvas, config);
        self.postMessage({ type: 'ready' });
        break;
      }

      case 'setTextSource': {
        if (!sim) return;
        sim.setTextSource(data.opts);
        break;
      }

      case 'setImageSource': {
        if (!sim) return;
        // Fetch and decode inside the worker — keeps the main thread free
        await sim.setImageSource(data.src, data.effect);
        break;
      }

      case 'setImageBitmap': {
        if (!sim) return;
        // Caller transferred the bitmap; use it directly (zero-copy)
        sim.setImageBitmap(data.bitmap, data.effect);
        break;
      }

      case 'move': {
        if (!sim) return;
        sim.handleMove(data.x, data.y, data.strength ?? 1);
        break;
      }

      case 'resize': {
        if (!sim) return;
        sim.resize(data.width, data.height);
        break;
      }

      case 'updateConfig': {
        if (!sim) return;
        sim.updateConfig(data.config);
        break;
      }

      case 'destroy': {
        sim?.destroy();
        sim = null;
        break;
      }

      default:
        console.warn('[fluidity-js worker] Unknown message type:', type);
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message ?? String(err) });
  }
};
