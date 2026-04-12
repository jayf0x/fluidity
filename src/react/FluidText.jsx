'use strict';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useFluid } from './useFluid.js';

/**
 * Renders text with an interactive WebGL fluid effect.
 *
 * @type {React.ForwardRefExoticComponent<import('../../types/index.d.ts').FluidTextProps & React.RefAttributes<import('../../types/index.d.ts').FluidHandle>>}
 */
export const FluidText = forwardRef(function FluidText(
  {
    text = '',
    fontSize = 100,
    color = '#ffffff',
    fontFamily = 'sans-serif',
    fontWeight = 900,
    className,
    style,
    config,
    useMouse = true,
    worker = true,
  },
  ref
) {
  const containerRef = useRef(null);
  const controllerRef = useFluid(containerRef, { worker, config });

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        controllerRef.current?.setTextSource({ text, fontSize, color, fontFamily, fontWeight });
      },
      updateLocation({ x, y, strength = 1 }) {
        controllerRef.current?.handleMove(x, y, strength);
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

  // Built-in pointer tracking — attached to the container so it covers the canvas
  useEffect(() => {
    if (!useMouse) return;
    const el = containerRef.current;
    if (!el) return;

    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      controllerRef.current?.handleMove(e.clientX - rect.left, e.clientY - rect.top, 2);
    };

    const onTouchMove = (e) => {
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
  }, [useMouse]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
});
