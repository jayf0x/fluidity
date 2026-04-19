/**
 * Fluid simulation Web Worker.
 *
 * Receives an OffscreenCanvas via the 'init' message and runs the simulation
 * entirely off the main thread. All public FluidSimulation methods are
 * exposed as message types.
 *
 * Message types (main → worker):
 *   init            { canvas: OffscreenCanvas, width, height, config }
 *   setTextSource   { opts: TextSourceOpts }
 *   setImageSource  { src: string, effect?: number, size?: string | number }
 *   setImageBitmap  { bitmap: ImageBitmap, effect?: number, size?: string | number }  (transferable)
 *   setBackground   { bitmap: ImageBitmap | null, size?: string | number }  (transferable if bitmap)
 *   move            { x, y, strength? }
 *   resize          { width, height }
 *   updateConfig    { config }
 *   destroy
 *
 * Message types (worker → main):
 *   ready
 *   error           { message }
 */
import { FluidSimulation } from '../core/simulation';

let sim: FluidSimulation | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, ...data } = e.data as { type: string; [key: string]: unknown };

  try {
    switch (type) {
      case 'init': {
        const { canvas, width, height, config } = data as {
          canvas: OffscreenCanvas;
          width: number;
          height: number;
          config: Record<string, unknown>;
        };
        canvas.width = width;
        canvas.height = height;
        sim = new FluidSimulation(canvas, config);
        self.postMessage({ type: 'ready' });
        break;
      }

      case 'setTextSource': {
        if (!sim) return;
        sim.setTextSource(data.opts as Parameters<FluidSimulation['setTextSource']>[0]);
        break;
      }

      case 'setImageSource': {
        if (!sim) return;
        await sim.setImageSource(
          data.src as string,
          data.effect as number | undefined,
          data.size as string | number | undefined
        );
        break;
      }

      case 'setImageBitmap': {
        if (!sim) return;
        sim.setImageBitmap(
          data.bitmap as ImageBitmap,
          data.effect as number | undefined,
          data.size as string | number | undefined
        );
        break;
      }

      case 'setBackground': {
        if (!sim) return;
        sim.setBackground(data.bitmap as ImageBitmap | null, data.size as string | number | undefined);
        break;
      }

      case 'splat': {
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
        if (!sim) return;
        sim.handleMove(data.x as number, data.y as number, (data.strength as number | undefined) ?? 1);
        break;
      }

      case 'resize': {
        if (!sim) return;
        sim.resize(data.width as number, data.height as number);
        break;
      }

      case 'updateConfig': {
        if (!sim) return;
        sim.updateConfig(data.config as Record<string, unknown>);
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
    self.postMessage({ type: 'error', message: (err as Error)?.message ?? String(err) });
  }
};
