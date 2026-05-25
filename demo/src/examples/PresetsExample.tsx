import { useEffect, useRef } from 'react';

import { FluidText, PRESETS } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { DemoWrapper } from '../components/DemoWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const mappedPresetColor: Record<PresetKey, string> = {
  calm: '#a8d8ea',
  sand: '#ffffff',
  wave: '#fff7e0',
  neon: '#ff2d9b',
  smoke: '#cccccc',
};

export function PresetsExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const { set, ...args } = useFluidControls(ref, store);

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
      ...selected,
      waterColor: (selected.waterColor ?? '#000000') as string,
      glowColor: (selected.glowColor ?? '#b3d9ff') as string,
    });
  }, [preset, set]);

  return (
    <DemoWrapper store={store}>
      <FluidText ref={ref} text={preset} fontSize={350} color={mappedPresetColor[preset]} {...args} preset={preset} />
    </DemoWrapper>
  );
}
