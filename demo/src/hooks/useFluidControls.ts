import { useEffect } from 'react';
import { useControls, useCreateStore } from 'leva';
import type { RefObject } from 'react';
import type { FluidConfig, FluidHandle } from 'fluidity-js';

export type LevaStore = ReturnType<typeof useCreateStore>;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbArrayToHex([r, g, b]: [number, number, number]): string {
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

const FLUID_CONFIG_SCHEMA = () => ({
  densityDissipation:  { value: 0.992, min: 0.9,   max: 1.0,  step: 0.001 },
  velocityDissipation: { value: 0.93,  min: 0.7,   max: 1.0,  step: 0.001 },
  pressureIterations:  { value: 25,    min: 1,     max: 60,   step: 1 },
  curl:                { value: 0.0001,min: 0,     max: 0.5,  step: 0.001 },
  splatRadius:         { value: 0.004, min: 0.001, max: 0.03, step: 0.001 },
  splatForce:          { value: 0.91,  min: 0.1,   max: 5.0,  step: 0.01 },
  refraction:          { value: 0.25,  min: 0,     max: 1.0,  step: 0.01 },
  specularExp:         { value: 1.01,  min: 0.1,   max: 10,   step: 0.1 },
  shine:               { value: 0.01,  min: 0,     max: 0.15, step: 0.001 },
  waterColor:          '#000000',
  glowColor:           '#b3d9ff',
});

/**
 * Registers the shared "fluid config" Leva panel and syncs → simulation.
 * Pass the page's isolated `store` (from `useCreateStore()`) for tab isolation.
 * Returns `set` to programmatically update controls (e.g. preset apply).
 */
export function useFluidControls(
  ref: RefObject<FluidHandle | null>,
  store: LevaStore
) {
  const [
    {
      waterColor,
      glowColor,
      densityDissipation,
      velocityDissipation,
      pressureIterations,
      curl,
      splatRadius,
      splatForce,
      refraction,
      specularExp,
      shine,
    },
    set,
  ] = useControls('fluid config', FLUID_CONFIG_SCHEMA, { store });

  useEffect(() => {
    ref.current?.updateConfig({
      densityDissipation,
      velocityDissipation,
      pressureIterations,
      curl,
      splatRadius,
      splatForce,
      refraction,
      specularExp,
      shine,
      waterColor: hexToRgb(waterColor),
      glowColor:  hexToRgb(glowColor),
    } satisfies Partial<FluidConfig>);
  }, [
    ref, densityDissipation, velocityDissipation, pressureIterations,
    curl, splatRadius, splatForce, refraction, specularExp, shine,
    waterColor, glowColor,
  ]);

  return { set };
}
