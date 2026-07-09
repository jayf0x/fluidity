import { useRef } from 'react';

import { DEFAULT_CONFIG_TEXT, FluidText } from 'fluidity-js';
import { Source, useShowcaseStore } from 'frontis/react';
import { button, useControls } from 'leva';

import { useFluidControls } from '../hooks/useFluidControls';

// import textExampleSource from './TextExample.tsx?raw';

const defaults: FluidConfig = {
  ...DEFAULT_CONFIG_TEXT,
  shine: 0.1,
  glowColor: '#f00',
  waterColor: '#1e2b4c',
  splatRadius: 0.1,
  specularExp: 0.5,
};

// Rendered inside <Showcase> (App). Local controls take the showcase store
// explicitly — Leva's useControls otherwise falls back to its global store.
export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const args = useFluidControls(ref, defaults);

  const props = useControls(
    'settings',
    {
      text: { value: 'Fluidity' },
      fontSize: { value: 100 * window.devicePixelRatio, min: 100, max: 1200, step: 10 },
      textAlign: { value: 'center' as 'left' | 'center' | 'right', options: ['left', 'center', 'right'] },
      textQuality: { value: 1, min: 1, max: 4, step: 1 },
      textBlur: { value: 1, min: 0, max: 2, step: 0.5 },
      reset: button(() => ref.current?.reset()),
    },
    { store: useShowcaseStore() }
  );

  return (
    <>
      <FluidText ref={ref} fontFamily="Ubuntu" {...args} {...props} />
      {/* <Source code={textExampleSource} /> */}
    </>
  );
}
