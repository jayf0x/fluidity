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
  { isWorkerEnabled = true, quality = {}, config = {} }: { isWorkerEnabled?: boolean; quality?: FluidQuality; config?: Partial<FluidConfig> } = {}
): RefObject<FluidController | null> {
  const controllerRef = useRef<FluidController | null>(null);
  const initOptsRef = useRef({ isWorkerEnabled, quality, config });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Create a fresh canvas every mount ---
    // This is the key: a newly-created canvas has never had transferControlToOffscreen
    // called on it, so it's safe to use regardless of prior mount/unmount cycles.
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.appendChild(canvas);

    // Read initial dimensions from the container (valid after paint in useEffect)
    const { isWorkerEnabled, quality: q, config: initConfig } = initOptsRef.current;
    const clampedDpr = Math.max(0.1, Math.min(1, q.dpr ?? 1));
    const dpr = (window.devicePixelRatio || 1) * clampedDpr;
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

    const controller = new FluidController(canvas, { isWorkerEnabled, quality: q, config: initConfig });
    controllerRef.current = controller;

    // Forward container resizes to the simulation
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const resizeDpr = (window.devicePixelRatio || 1) * clampedDpr;
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
  }, []); // intentionally empty — one-time init per mount

  return controllerRef;
}
