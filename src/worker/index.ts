/**
 * Fluid simulation Web Worker.
 *
 * Receives an OffscreenCanvas via the 'init' message and runs the simulation
 * entirely off the main thread. All public FluidSimulation methods are
 * exposed as message types.
 *
 * Message types (main → worker):
 *   init            { canvas: OffscreenCanvas, width, height, config, dpr, quality: { dpr, sim } }
 *   setTextSource   { opts: TextSourceOpts }
 *   setImageSource  { src: string, effect?: number, size?: string | number }
 *   setImageBitmap  { bitmap: ImageBitmap, effect?: number, size?: string | number }  (transferable)
 *   setBackground   { bitmap: ImageBitmap | null, size?: string | number }  (transferable if bitmap)
 *   move            { x, y, strength? }
 *   resize          { width, height, dpr }
 *   updateQuality   { quality: { dpr, sim } }
 *   updateConfig    { config }
 *   splat           { x, y, vx, vy, strength? }
 *   destroy
 *
 * Message types (worker → main):
 *   ready
 *   error           { message }
 */
import { FluidSimulation } from '../core/simulation';

let sim: FluidSimulation | null = null;

// Resolved once 'init' completes so that messages arriving during the async
// WebGPU adapter request are queued (via await) rather than dropped.
let _markReady: (() => void) | undefined;
const simReady = new Promise<void>((r) => { _markReady = r; });

self.onmessage = async (e: MessageEvent) => {
  const { type, ...data } = e.data as { type: string; [key: string]: unknown };

  try {
    switch (type) {
      case 'init': {
        const { canvas, width, height, config, dpr, quality } = data as {
          canvas: OffscreenCanvas;
          width: number;
          height: number;
          config: Record<string, unknown>;
          dpr: number;
          quality?: FluidQuality;
        };
        canvas.width = width;
        canvas.height = height;
        // WebGPU-first: FluidSimulation.create() tries WebGPU then falls back to WebGL
        sim = await FluidSimulation.create(canvas, config, quality ?? {});
        sim.resize(width, height, dpr || 1);
        _markReady!();
        self.postMessage({ type: 'ready' });
        break;
      }

      case 'setTextSource': {
        await simReady;
        if (!sim) return;
        sim.setTextSource(data.opts as Parameters<FluidSimulation['setTextSource']>[0]);
        break;
      }

      case 'setImageSource': {
        await simReady;
        if (!sim) return;
        await sim.setImageSource(
          data.src as string,
          data.effect as number | undefined,
          data.size as string | number | undefined
        );
        break;
      }

      case 'setImageBitmap': {
        await simReady;
        if (!sim) return;
        sim.setImageBitmap(
          data.bitmap as ImageBitmap,
          data.effect as number | undefined,
          data.size as string | number | undefined
        );
        break;
      }

      case 'setBackground': {
        await simReady;
        if (!sim) return;
        sim.setBackground(data.bitmap as ImageBitmap | null, data.size as string | number | undefined);
        break;
      }

      case 'splat': {
        await simReady;
        if (!sim) return;
        sim.splat(
          data.x as number,
          data.y as number,
          data.vx as number,
          data.vy as number,
          (data.strength as number | undefined) ?? 1
        );
        break;
      }

      case 'move': {
        await simReady;
        if (!sim) return;
        sim.handleMove(data.x as number, data.y as number, (data.strength as number | undefined) ?? 1);
        break;
      }

      case 'resize': {
        await simReady;
        if (!sim) return;
        sim.resize(data.width as number, data.height as number, data.dpr as number | undefined);
        break;
      }

      case 'updateQuality': {
        await simReady;
        if (!sim) return;
        sim.updateQuality(data.quality as FluidQuality);
        break;
      }

      case 'updateConfig': {
        await simReady;
        if (!sim) return;
        sim.updateConfig(data.config as Record<string, unknown>);
        break;
      }

      case 'destroy': {
        await simReady;
        sim?.destroy();
        sim = null;
        break;
      }

      default:
        console.warn('[fluidity-js worker] Unknown message type:', type);
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: (err as Error)?.message ?? String(err) });
  }
};
