import { useCallback, useEffect, useMemo } from 'react';
import type { RefObject } from 'react';

import type { FluidAlgorithm, FluidConfig, FluidHandle, PresetKey } from 'fluidity-js';
import { useControls } from 'leva';

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbArrayToHex([r, g, b]: RGB): string {
  const h = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Registers the shared "fluid config" Leva panel and syncs values → simulation.
 * Pass the page's isolated `store` (from `useCreateStore()`) for tab isolation.bu
 * Returns `set` to programmatically update controls (e.g. when a preset is applied).
 */
export function useFluidControls(
  ref: RefObject<FluidHandle | null>,
  store: LevaStore,
  customDefaults: Partial<FluidConfigLeva> = {}
) {
  const values = useMemo<FluidConfigLeva>(
    () => ({
      densityDissipation: 0.992,
      velocityDissipation: 0.93,
      pressureIterations: 1,
      curl: 0.0001,
      splatRadius: 0.004,
      splatForce: 0.91,
      refraction: 0.25,
      specularExp: 1.01,
      shine: 0.01,
      warpStrength: 0.015,
      waterColor: '#000000',
      glowColor: '#b3d9ff',
      algorithm: 'standard',
      preset: undefined,
      ...customDefaults,
    }),
    []
  );

  const fluidSchema = useCallback(
    () => ({
      densityDissipation: { value: values.densityDissipation, min: 0.9, max: 1.0, step: 0.001 },
      velocityDissipation: { value: values.velocityDissipation, min: 0.7, max: 1.0, step: 0.001 },
      pressureIterations: { value: values.pressureIterations, min: 0.1, max: 50, step: 0.1 },
      curl: { value: values.curl, min: 0, max: 1, step: 0.01 },
      splatRadius: { value: values.splatRadius, min: 0.001, max: 0.03, step: 0.001 },
      splatForce: { value: values.splatForce, min: 0.1, max: 5.0, step: 0.01 },
      refraction: { value: values.refraction, min: 0, max: 1.0, step: 0.01 },
      specularExp: { value: values.specularExp, min: 0.1, max: 10, step: 0.1 },
      shine: { value: values.shine, min: 0, max: 0.15, step: 0.001 },
      warpStrength: { value: values.warpStrength, min: 0.001, max: 0.1, step: 0.001 },
      waterColor: values.waterColor,
      glowColor: values.glowColor,
      algorithm: {
        value: values.algorithm,
        options: ['standard', 'glass', 'ink', 'aurora', 'ripple'] satisfies FluidAlgorithm[],
      },
      // preset: { value: values.algorithm, options: ['calm', 'neon', 'smoke', 'storm', 'wave'] satisfies PresetKey[] },
    }),
    []
  );
  const [{ waterColor, glowColor, ...other }, set] = useControls('fluid config', fluidSchema, { store });

  other.algorithm;

  useEffect(() => {
    ref.current?.updateConfig({
      ...other,
      algorithm: other.algorithm as FluidAlgorithm,
      waterColor: hexToRgb(waterColor),
      glowColor: hexToRgb(glowColor),
    } satisfies Partial<FluidConfig>);
  }, [ref, other, waterColor, glowColor]);

  return { set };
}
