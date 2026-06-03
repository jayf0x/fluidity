import { useRef } from 'react';

import { FluidText } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { DemoWrapper } from '../components/DemoWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaultProps: Partial<FluidConfigLeva> = {
  // densityDissipation: 0.9,
  // velocityDissipation: 0.9,
  // pressureIterations: 3,
  // curl: 0.2,
  // splatRadius: 0.2,
  // splatForce: 0.5,
  // refraction: 0.2,
  // specularExp: 0.01,
  // shine: 0.5,
  // waterColor: '#090017',
  // glowColor: '#b04721',
};
export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const args = useFluidControls(ref, store, defaultProps);

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
