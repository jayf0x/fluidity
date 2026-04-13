import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useFluid } from './useFluid.js';
import { mergeConfig } from '../core/config.js';
import { loadImageBitmap } from '../core/textures.js';
import type { FluidImageProps, FluidHandle } from '../../types/index.js';

export const FluidImage = forwardRef<FluidHandle, FluidImageProps>(function FluidImage(
  {
    src,
    effect = 0.4,
    imageSize = 'cover',
    className,
    style,
    config,
    preset,
    algorithm,
    backgroundColor = '#0a0a0a',
    backgroundSrc,
    backgroundSize = 'cover',
    isMouseEnabled = true,
    isWorkerEnabled = true,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useFluid(containerRef, {
    isWorkerEnabled,
    config: mergeConfig({ ...config, ...(algorithm ? { algorithm } : {}) }, preset),
  });

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (src) controllerRef.current?.setImageSource(src, effect, imageSize);
      },
      updateLocation({ x, y, strength = 1 }: { x: number; y: number; strength?: number }) {
        controllerRef.current?.handleMove(x, y, strength);
      },
      updateConfig(cfg) {
        controllerRef.current?.updateConfig(cfg);
      },
    }),
    [src, effect, imageSize]
  );

  // Reload whenever src, effect, or imageSize changes
  useEffect(() => {
    if (!src) return;
    controllerRef.current?.setImageSource(src, effect, imageSize);
  }, [src, effect, imageSize]);

  // Sync algorithm prop → updateConfig for reactive changes
  useEffect(() => {
    if (algorithm !== undefined) {
      controllerRef.current?.updateConfig({ algorithm });
    }
  }, [algorithm]);

  // Load + forward background image to the simulation
  useEffect(() => {
    if (!backgroundSrc) {
      controllerRef.current?.setBackground(null);
      return;
    }
    let cancelled = false;
    loadImageBitmap(backgroundSrc)
      .then((bitmap) => {
        if (cancelled) { bitmap.close(); return; }
        controllerRef.current?.setBackground(bitmap, backgroundSize);
      })
      .catch((err) => console.error('[fluidity-js] backgroundSrc load failed:', err));
    return () => { cancelled = true; };
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
      style={{
        position: 'relative', display: 'block', width: '100%', height: '100%',
        background: backgroundColor,
        ...style,
      } as CSSProperties}
    />
  );
});
