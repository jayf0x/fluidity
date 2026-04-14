import { useEffect, useRef } from 'react';
import { useControls, button, useCreateStore, LevaPanel } from 'leva';
import { FluidText, DEFAULT_CONFIG, PRESETS, type FluidHandle, type PresetKey } from 'fluidity-js';
import { useFluidControls, rgbArrayToHex } from '../hooks/useFluidControls';

const PRESET_META: Record<PresetKey, { text: string; color: string }> = {
  calm: { text: 'calm', color: '#a8d8ea' },
  storm: { text: 'storm', color: '#ffffff' },
  wave: { text: 'wave', color: '#e0f0ff' },
  neon: { text: 'neon', color: '#ff2d9b' },
  smoke: { text: 'smoke', color: '#cccccc' },
};

export function PresetsExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const { set } = useFluidControls(ref, store);

  const [{ preset }] = useControls(
    'settings',
    () => ({
      preset: {
        options: Object.keys(PRESETS) as PresetKey[],
        value: 'wave' as PresetKey,
      },
      reset: button(() => ref.current?.reset()),
    }),
    { store }
  );

  // Preset → fill Leva fluid config sliders
  useEffect(() => {
    const p = PRESETS[preset as PresetKey];
    const d = DEFAULT_CONFIG;
    set({
      densityDissipation: p.densityDissipation ?? d.densityDissipation,
      velocityDissipation: p.velocityDissipation ?? d.velocityDissipation,
      pressureIterations: p.pressureIterations ?? d.pressureIterations,
      curl: p.curl ?? d.curl,
      splatRadius: p.splatRadius ?? d.splatRadius,
      splatForce: p.splatForce ?? d.splatForce,
      refraction: p.refraction ?? d.refraction,
      specularExp: p.specularExp ?? d.specularExp,
      shine: p.shine ?? d.shine,
      waterColor: rgbArrayToHex((p.waterColor ?? d.waterColor) as [number, number, number]),
      glowColor: rgbArrayToHex((p.glowColor ?? d.glowColor) as [number, number, number]),
    });
  }, [preset, set]);

  const meta = PRESET_META[preset as PresetKey];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LevaPanel store={store} />
      <FluidText
        ref={ref}
        text={meta.text}
        fontSize={150}
        color={meta.color}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
