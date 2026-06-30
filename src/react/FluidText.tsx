import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';

import { DEFAULT_CONFIG_TEXT, DEFAULT_PROPS_TEXT, DEFAULT_QUALITY, mergeConfig, normalizeConfig } from '../core/config';
import { loadImageBitmap } from '../core/textures';
import { log } from '../utils';
import { useFluid } from './useFluid';

export const FluidText = forwardRef<FluidHandle, FluidTextProps>(function FluidText(
  {
    text,
    fontSize = DEFAULT_PROPS_TEXT.fontSize,
    color = DEFAULT_PROPS_TEXT.color,
    fontFamily = DEFAULT_PROPS_TEXT.fontFamily,
    fontWeight = DEFAULT_PROPS_TEXT.fontWeight,
    textAlign = DEFAULT_PROPS_TEXT.textAlign,
    textQuality = DEFAULT_PROPS_TEXT.textQuality,
    className,
    style,
    preset,
    algorithm,
    backgroundColor = DEFAULT_PROPS_TEXT.backgroundColor,
    backgroundSrc,
    backgroundSize = DEFAULT_PROPS_TEXT.backgroundSize,
    mouseEnabled = DEFAULT_PROPS_TEXT.mouseEnabled,
    workerEnabled = DEFAULT_PROPS_TEXT.workerEnabled,
    webGPUEnabled = true,
    alphaEnabled = true,
    pixelRatio = DEFAULT_QUALITY.dpr,
    simResolution = DEFAULT_QUALITY.sim,
    // FluidConfig flat props
    densityDissipation,
    velocityDissipation,
    pressureIterations,
    curl,
    splatRadius,
    splatForce,
    refraction,
    specularExp,
    shine,
    waterColor,
    glowColor,
    warpStrength,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);

  const configProps = Object.fromEntries(
    Object.entries({
      densityDissipation,
      velocityDissipation,
      pressureIterations,
      curl,
      splatRadius,
      splatForce,
      refraction,
      specularExp,
      shine,
      waterColor,
      glowColor,
      algorithm,
      warpStrength,
    }).filter(([, v]) => v !== undefined)
  ) as Partial<FluidConfig>;

  const controllerRef = useFluid(containerRef, {
    workerEnabled,
    webGPUEnabled,
    alphaEnabled,
    pixelRatio,
    simResolution,
    config: normalizeConfig(mergeConfig(configProps, preset, DEFAULT_CONFIG_TEXT)) as FluidConfig,
  });

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        controllerRef.current?.setTextSource({ text, fontSize, color, fontFamily, fontWeight, textAlign, textQuality });
      },
      move(x: number, y: number, strength = 1) {
        controllerRef.current?.handleMove(x, y, strength);
      },
      splat(x: number, y: number, velocityX: number, velocityY: number, strength = 1) {
        controllerRef.current?.splat(x, y, velocityX, velocityY, strength);
      },
      updateConfig(cfg) {
        controllerRef.current?.updateConfig(normalizeConfig(cfg));
      },
    }),
    [text, fontSize, color, fontFamily, fontWeight, textAlign, textQuality]
  );

  // Sync text source whenever relevant props change (webGPUEnabled/alphaEnabled trigger reinit → re-set source)
  useEffect(() => {
    controllerRef.current?.setTextSource({ text, fontSize, color, fontFamily, fontWeight, textAlign, textQuality });
  }, [text, fontSize, color, fontFamily, fontWeight, textAlign, textQuality, webGPUEnabled, alphaEnabled]);

  // Sync config/preset → updateConfig for reactive changes
  const configKey = JSON.stringify(configProps);
  useEffect(() => {
    controllerRef.current?.updateConfig(
      normalizeConfig(mergeConfig(configProps, preset, DEFAULT_CONFIG_TEXT)) as FluidConfig
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, configKey, webGPUEnabled, alphaEnabled]);

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
      .catch((err) => log('backgroundSrc load failed:', err));
    return () => {
      cancelled = true;
    };
  }, [backgroundSrc, backgroundSize, webGPUEnabled, alphaEnabled]);

  // Built-in pointer tracking
  useEffect(() => {
    if (!mouseEnabled) return;
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
  }, [mouseEnabled]);

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
