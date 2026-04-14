import { useRef } from 'react';

import { type FluidHandle, FluidText } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaultProps: Partial<FluidConfigLeva> = {
  densityDissipation: 0.998,
  // velocityDissipation: 0,
};
export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  useFluidControls(ref, store, defaultProps);

  const props = useControls(
    'settings',
    {
      text: { value: 'fluidity' },
      reset: button(() => ref.current?.reset()),
    },
    { store }
  );

  return (
    <ExampleWrapper store={store}>
      <FluidText ref={ref} fontSize={200} {...props} />
    </ExampleWrapper>
  );
}
