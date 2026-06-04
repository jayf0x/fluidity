import { useCallback, useEffect, useMemo } from 'react';
import type { RefObject } from 'react';

import { DEFAULT_CONFIG } from 'fluidity-js';
import { useControls } from 'leva';

type Defaults = Partial<FluidConfig> & {
  pixelRatio?: number;
  simResolution?: number;
  preset?: PresetKey;
  backgroundColor?: string;
  webGPUEnabled?: boolean;
  alphaEnabled?: boolean;
};

/**
 * Registers the shared "fluid config" Leva panel and syncs values → simulation.
 * Pass the page's isolated `store` (from `useCreateStore()`) for tab isolation.
 * Returns flat props — spread directly onto FluidText / FluidImage.
 *
 * customDefaults — pass DEFAULT_CONFIG for image or DEFAULT_CONFIG_TEXT for text
 * to initialize the Leva panel with the right starting values.
 */
export function useFluidControls(ref: RefObject<FluidHandle | null>, store: LevaStore, customDefaults: Defaults = {}) {
  const values = useMemo(() => {
    const merged = {
      // sim defaults from library base config
      ...DEFAULT_CONFIG,
      // component prop defaults
      preset: undefined as PresetKey | undefined,
      webGPUEnabled: true,
      alphaEnabled: true,
      backgroundColor: '#0a0a0a',
      pixelRatio: 1 / (window.devicePixelRatio || 1),
      simResolution: 0.5,
      // caller overrides (e.g. DEFAULT_CONFIG_TEXT for text examples)
      ...customDefaults,
    };
    return {
      ...merged,
      waterColor: merged.waterColor as string,
      glowColor: merged.glowColor as string,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const [
    {
      waterColor,
      glowColor,
      preset: presetRaw,
      backgroundColor,
      webGPUEnabled,
      alphaEnabled,
      pixelRatio,
      simResolution,
      ...simConfig
    },
    set,
  ] = useControls('fluid config', fluidSchema, { store });

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
