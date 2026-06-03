import { useRef } from 'react';

import { DEFAULT_CONFIG_TEXT, FluidText } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { DemoWrapper } from '../components/DemoWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaults: FluidConfig = {
  ...DEFAULT_CONFIG_TEXT,
  shine: 0.1,
  glowColor: '#f00',
  waterColor: '#1e2b4c',
  splatRadius: 0.1,
  specularExp: 0.5,
};
export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const args = useFluidControls(ref, store, defaults);

  const props = useControls(
    'settings',
    {
      text: { value: 'Fluidity' },
      fontSize: { value: 400, min: 100, max: 1200, step: 10 },
      reset: button(() => ref.current?.reset()),
    },
    { store }
  );

  return (
    <DemoWrapper store={store}>
      <FluidText ref={ref} fontFamily="Ubuntu" {...args} {...props} />
    </DemoWrapper>
  );
}
