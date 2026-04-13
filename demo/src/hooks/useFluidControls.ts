import { useEffect } from 'react';
import { useControls } from 'leva';
import type { RefObject } from 'react';
import type { FluidConfig, FluidHandle } from 'fluidity-js';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Wires up a shared "fluid config" section in the Leva panel and syncs it
 * to the simulation via ref.current.updateConfig().
 *
 * Call this in any example that wants standard fluid controls.
 * Use a separate useControls('settings', {...}) call for page-specific controls.
 */
export function useFluidControls(ref: RefObject<FluidHandle | null>) {
  const {
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
  } = useControls('fluid config', {
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
      glowColor: hexToRgb(glowColor),
    } satisfies Partial<FluidConfig>);
  }, [
    ref, densityDissipation, velocityDissipation, pressureIterations,
    curl, splatRadius, splatForce, refraction, specularExp, shine,
    waterColor, glowColor,
  ]);
}
