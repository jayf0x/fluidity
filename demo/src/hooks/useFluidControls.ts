import { useCallback, useEffect, useMemo } from 'react';
import type { RefObject } from 'react';

import { useControls } from 'leva';

type Defaults = Partial<FluidConfigLeva> & {
  pixelRatio?: number;
  simResolution?: number;
  preset?: PresetKey;
  backgroundColor?: string;
  alphaEnabled?: boolean;
};

/**
 * Registers the shared "fluid config" Leva panel and syncs values → simulation.
 * Pass the page's isolated `store` (from `useCreateStore()`) for tab isolation.
 * Returns flat props — spread directly onto FluidText / FluidImage.
 */
export function useFluidControls(ref: RefObject<FluidHandle | null>, store: LevaStore, customDefaults: Defaults = {}) {
  const values = useMemo(
    () => ({
      densityDissipation: 0.87,
      velocityDissipation: 0.30,
      pressureIterations: 1,
      curl: 0.0001,
      splatRadius: 0.08,
      splatForce: 0.17,
      refraction: 0.25,
      specularExp: 0.09,
      shine: 0.07,
      warpStrength: 0.14,
      waterColor: '#000000',
      glowColor: '#b3d9ff',
      algorithm: 'standard' satisfies FluidAlgorithm,
      preset: undefined satisfies PresetKey | undefined,
      webGPUEnabled: true,
      alphaEnabled: true,
      backgroundColor: '#0a0a0a',
      pixelRatio: 1,
      simResolution: 0.5,
      ...customDefaults,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fluidSchema = useCallback(
    () => ({
      // ── Simulation ──────────────────────────────────────────────────────────
      densityDissipation: { value: values.densityDissipation, min: 0, max: 1, step: 0.01 },
      velocityDissipation: { value: values.velocityDissipation, min: 0, max: 1, step: 0.01 },
      pressureIterations: { value: values.pressureIterations, min: 1, max: 50, step: 1 },
      curl: { value: values.curl, min: 0, max: 1, step: 0.01 },
      splatRadius: { value: values.splatRadius, min: 0, max: 1, step: 0.01 },
      splatForce: { value: values.splatForce, min: 0, max: 1, step: 0.01 },
      refraction: { value: values.refraction, min: 0, max: 1.0, step: 0.01 },
      specularExp: { value: values.specularExp, min: 0, max: 1, step: 0.01 },
      shine: { value: values.shine, min: 0, max: 1, step: 0.01 },
      warpStrength: { value: values.warpStrength, min: 0, max: 1, step: 0.01 },
      waterColor: values.waterColor,
      glowColor: values.glowColor,
      algorithm: {
        value: values.algorithm,
        options: ['standard', 'glass', 'ink', 'aurora', 'ripple'] satisfies FluidAlgorithm[],
      },
      // ── Component props (returned, NOT sent to updateConfig) ────────────────
      preset: {
        value: values.preset ?? ('none' as PresetKey | 'none'),
        options: ['none', 'calm', 'sand', 'wave', 'neon', 'smoke'] satisfies (PresetKey | 'none')[],
      },
      pixelRatio: { value: values.pixelRatio, min: 0.01, max: 1, step: 0.01 },
      simResolution: { value: values.simResolution, min: 0.01, max: 1, step: 0.01 },
      webGPUEnabled: values.webGPUEnabled,
      alphaEnabled: values.alphaEnabled,
      backgroundColor: values.backgroundColor,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [{ waterColor, glowColor, preset: presetRaw, backgroundColor, webGPUEnabled, alphaEnabled, pixelRatio, simResolution, ...simConfig }, set] =
    useControls('fluid config', fluidSchema, { store });

  // Resolve 'none' sentinel back to undefined so callers can pass it straight to preset prop
  const preset = presetRaw === 'none' ? undefined : (presetRaw as PresetKey);

  // Sync all simulation config → updateConfig whenever Leva values change
  useEffect(() => {
    ref.current?.updateConfig({
      ...simConfig,
      algorithm: simConfig.algorithm as FluidAlgorithm,
      waterColor: waterColor as FluidColor,
      glowColor: glowColor as FluidColor,
    } satisfies Partial<FluidConfig>);
  }, [ref, simConfig, waterColor, glowColor]);

  return { set, preset, backgroundColor, pixelRatio, simResolution, webGPUEnabled, alphaEnabled };
}
