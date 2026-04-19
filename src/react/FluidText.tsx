import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';

import { DEFAULT_CONFIG_TEXT, DEFAULT_PROPS_TEXT, mergeConfig } from '../core/config';
import { loadImageBitmap } from '../core/textures';
import { useFluid } from './useFluid';

export const FluidText = forwardRef<FluidHandle, FluidTextProps>(function FluidText(
  {
    text,
    fontSize = DEFAULT_PROPS_TEXT.fontSize,
    color = DEFAULT_PROPS_TEXT.color,
    fontFamily = DEFAULT_PROPS_TEXT.fontFamily,
    fontWeight = DEFAULT_PROPS_TEXT.fontWeight,
    className,
    style,
    config,
    preset,
    algorithm,
    backgroundColor = DEFAULT_PROPS_TEXT.backgroundColor,
    backgroundSrc,
    backgroundSize = DEFAULT_PROPS_TEXT.backgroundSize,
    isMouseEnabled = DEFAULT_PROPS_TEXT.isMouseEnabled,
    isWorkerEnabled = DEFAULT_PROPS_TEXT.isWorkerEnabled,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useFluid(containerRef, {
    isWorkerEnabled,
    config: mergeConfig({ ...config, ...(algorithm ? { algorithm } : {}) }, preset, DEFAULT_CONFIG_TEXT),
  });

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        controllerRef.current?.setTextSource({ text, fontSize, color, fontFamily, fontWeight });
      },
      move({ x, y, strength = 1 }: { x: number; y: number; strength?: number }) {
        controllerRef.current?.handleMove(x, y, strength);
      },
      splat(x: number, y: number, vx: number, vy: number, strength = 1) {
        controllerRef.current?.splat(x, y, vx, vy, strength);
      },
      updateConfig(cfg) {
        controllerRef.current?.updateConfig(cfg);
      },
    }),
    [text, fontSize, color, fontFamily, fontWeight]
  );

  // Sync text source whenever relevant props change
  useEffect(() => {
    controllerRef.current?.setTextSource({ text, fontSize, color, fontFamily, fontWeight });
  }, [text, fontSize, color, fontFamily, fontWeight]);

  // Sync config/preset/algorithm → updateConfig for reactive changes
  const configKey = JSON.stringify(config);
  useEffect(() => {
    controllerRef.current?.updateConfig(
      mergeConfig({ ...config, ...(algorithm !== undefined ? { algorithm } : {}) }, preset, DEFAULT_CONFIG_TEXT)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, algorithm, configKey]);

  // Load + forward background image to the simulation
  useEffect(() => {
    if (!backgroundSrc) {
      controllerRef.current?.setBackground(null);
      return;
    }
    let cancelled = false;
    loadImageBitmap(backgroundSrc)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        controllerRef.current?.setBackground(bitmap, backgroundSize);
      })
      .catch((err) => console.error('[fluidity-js] backgroundSrc load failed:', err));
    return () => {
      cancelled = true;
    };
  }, [backgroundSrc, backgroundSize]);

  // Built-in pointer tracking
  useEffect(() => {
    if (!isMouseEnabled) return;
    const el = containerRef.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      controllerRef.current?.handleMove(e.clientX - rect.left, e.clientY - rect.top, 2);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const touch = e.touches[0];
      controllerRef.current?.handleMove(touch.clientX - rect.left, touch.clientY - rect.top, 1);
    };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [isMouseEnabled]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={
        {
          position: 'relative',
          display: 'block',
          width: '100%',
          height: '100%',
          background: backgroundColor,
          ...style,
        } as CSSProperties
      }
    />
  );
});
