import { useRef } from 'react';

import { type FluidHandle, FluidText } from 'fluidity-js';
import { LevaPanel, button, useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { SPLIT_IMAGE_SRC } from '../constants';
import { useFluidControls } from '../hooks/useFluidControls';

export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  useFluidControls(ref, store);

  const props = useControls(
    'settings',
    {
      text: { value: 'fluidity' },
      fontSize: { value: 130, min: 40, max: 220, step: 2 },
      color: '#ffffff',
      reset: button(() => ref.current?.reset()),
    },
    { store }
  );

  return (
    <ExampleWrapper store={store}>
      <FluidText ref={ref} {...props} backgroundSrc={SPLIT_IMAGE_SRC} />
    </ExampleWrapper>
  );
}
