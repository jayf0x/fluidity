import { useEffect, useRef } from 'react';

import { DEFAULT_CONFIG, type FluidHandle, FluidText, PRESETS, type PresetKey } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { rgbArrayToHex, useFluidControls } from '../hooks/useFluidControls';

const mappedPresetColor: Record<PresetKey, string> = {
  calm: '#a8d8ea',
  storm: '#ffffff',
  wave: '#e0f0ff',
  neon: '#ff2d9b',
  smoke: '#cccccc',
};

export function PresetsExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const { set, backgroundColor } = useFluidControls(ref, store);

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
    const selected = PRESETS[preset];
    set({
      ...DEFAULT_CONFIG,
      ...selected,
      waterColor: rgbArrayToHex((selected.waterColor ?? DEFAULT_CONFIG.waterColor) as RGB),
      glowColor: rgbArrayToHex((selected.glowColor ?? DEFAULT_CONFIG.glowColor) as RGB),
    });
  }, [preset, set]);

  return (
    <ExampleWrapper store={store}>
      <FluidText
        ref={ref}
        text={preset}
        preset={preset}
        fontSize={150}
        color={mappedPresetColor[preset]}
        backgroundColor={backgroundColor}
      />
    </ExampleWrapper>
  );
}
