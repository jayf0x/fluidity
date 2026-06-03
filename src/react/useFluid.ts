import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { FluidController } from '../fluid-controller';

/**
 * Manages the FluidController lifecycle.
 *
 * Creates a fresh <canvas> element inside the container on every mount and
 * removes it on unmount. This is intentional: it ensures React StrictMode's
 * double-invoke pattern never reuses a canvas whose control was already
 * transferred to an OffscreenCanvas worker — that transfer is irreversible
 * and can't be undone during cleanup.
 */
export function useFluid(
  containerRef: RefObject<HTMLElement | null>,
  {
    workerEnabled = true,
    webGPUEnabled = true,
    alphaEnabled = true,
    pixelRatio,
    simResolution,
    config = {},
  }: {
    workerEnabled?: boolean;
    webGPUEnabled?: boolean;
    alphaEnabled?: boolean;
    pixelRatio?: number;
    simResolution?: number;
    config?: Partial<FluidConfig>;
  } = {}
): RefObject<FluidController | null> {
  const quality: FluidQuality = { dpr: pixelRatio, sim: simResolution };
  const controllerRef = useRef<FluidController | null>(null);
  const initOptsRef = useRef({ workerEnabled, quality, config });
  const clampedDprRef = useRef(Math.max(0.1, Math.min(1, pixelRatio ?? 1)));
  const prevQualityRef = useRef<{ pixelRatio: number | undefined; simResolution: number | undefined }>({
    pixelRatio,
    simResolution,
  });

  // Re-runs when webGPUEnabled/alphaEnabled changes (full teardown + reinit).
  // Other init opts are stable refs — they don't need to trigger reinit.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create a fresh canvas every (re)init — transferControlToOffscreen is
    // irreversible so we can never reuse a canvas across init cycles.
    const canvas = document.createElement('canvas');
    canvas.id = `fluid_canvas_${Date.now()}`;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.appendChild(canvas);

    // Read stable opts from ref; webGPUEnabled and alphaEnabled come from the closure (they are the deps).
    const { workerEnabled: we, quality: q, config: initConfig } = initOptsRef.current;
    const dpr = (window.devicePixelRatio || 1) * clampedDprRef.current;
    const rect = container.getBoundingClientRect();
    const initW = Math.round((rect.width || container.clientWidth) * dpr) || 0;
    const initH = Math.round((rect.height || container.clientHeight) * dpr) || 0;
    if (initW > 0) {
      canvas.width = initW;
      canvas.height = initH;
    }

    if (initH === 0) {
      console.warn(
        '[fluidity-js] Container has zero height — simulation will not render. ' +
          'Avoid height:auto or percentage heights without a sized ancestor. Use explicit pixel values instead.'
      );
    }

    const controller = new FluidController(canvas, {
      workerEnabled: we,
      webGPUEnabled,
      alphaEnabled,
      quality: q,
      config: initConfig,
    });
    controllerRef.current = controller;

    // Forward container resizes to the simulation — reads clampedDprRef so pixelRatio changes are picked up
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const resizeDpr = (window.devicePixelRatio || 1) * clampedDprRef.current;
        const { inlineSize: w, blockSize: h } = entry.contentBoxSize[0];
        controller.resize(Math.round(w * resizeDpr), Math.round(h * resizeDpr));
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      controller.destroy();
      canvas.remove();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webGPUEnabled, alphaEnabled]);

  // Propagate quality changes after mount
  useEffect(() => {
    clampedDprRef.current = Math.max(0.1, Math.min(1, pixelRatio ?? 1));
    const prev = prevQualityRef.current;
    prevQualityRef.current = { pixelRatio, simResolution };
    const controller = controllerRef.current;
    const container = containerRef.current;
    if (!controller || !container || (prev.pixelRatio === pixelRatio && prev.simResolution === simResolution)) return;
    controller.updateQuality({ dpr: pixelRatio, sim: simResolution });
    const resizeDpr = (window.devicePixelRatio || 1) * clampedDprRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) controller.resize(Math.round(w * resizeDpr), Math.round(h * resizeDpr));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelRatio, simResolution, webGPUEnabled, alphaEnabled]);

  return controllerRef;
}
