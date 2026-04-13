import { useRef } from 'react';
import { useControls, button } from 'leva';
import { FluidText, PRESETS, type FluidHandle, type PresetKey } from 'fluidity-js';

const PRESET_META: Record<PresetKey, { text: string; color: string }> = {
  calm:  { text: 'calm',  color: '#a8d8ea' },
  storm: { text: 'storm', color: '#ffffff' },
  wave:  { text: 'wave',  color: '#e0f0ff' },
  neon:  { text: 'neon',  color: '#ff2d9b' },
  smoke: { text: 'smoke', color: '#cccccc' },
};

export function PresetsExample() {
  const ref = useRef<FluidHandle>(null);

  const { preset } = useControls('settings', {
    preset: {
      options: Object.keys(PRESETS) as PresetKey[],
      value: 'wave' as PresetKey,
    },
    reset: button(() => ref.current?.reset()),
  });

  const meta = PRESET_META[preset as PresetKey];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <FluidText
        ref={ref}
        key={preset}
        text={meta.text}
        fontSize={150}
        color={meta.color}
        preset={preset as PresetKey}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
