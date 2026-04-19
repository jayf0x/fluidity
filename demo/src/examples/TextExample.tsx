import { useRef } from 'react';

import { FluidText } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaultProps: Partial<FluidConfigLeva> = {
  densityDissipation: 0.997,
  velocityDissipation: 0.98,
  pressureIterations: 3,
  curl: 0.15,
  splatRadius: 0.01,
  splatForce: 3,
  refraction: 0.25,
  specularExp: 1,
  shine: 0.1,
  glowColor: '#0080ff',
};
export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const { preset, backgroundColor } = useFluidControls(ref, store, defaultProps);

  const props = useControls(
    'settings',
    {
      text: { value: 'Fluidity' },
      reset: button(() => ref.current?.reset()),
    },
    { store }
  );

  return (
    <ExampleWrapper store={store}>
      <FluidText
        ref={ref}
        fontSize={200}
        fontFamily="Ubunutu"
        preset={preset}
        backgroundColor={backgroundColor}
        textQuality={10}
        {...props}
      />
    </ExampleWrapper>
  );
}
