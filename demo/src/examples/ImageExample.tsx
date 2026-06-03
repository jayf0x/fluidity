import { useRef } from 'react';

import { FluidImage } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { DemoWrapper } from '../components/DemoWrapper';
import { useFluidControls } from '../hooks/useFluidControls';
import { useImages } from '../hooks/useImages';

const defaults: Partial<FluidConfig> = {
  splatForce: 0.9,
};

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const args = useFluidControls(ref, store, defaults);

  const { urls, updateImages } = useImages();
  const { imageSize } = useControls(
    'settings',
    {
      imageSize: { label: 'size', options: ['cover', 'contain', '80%', '50%'], value: 'cover' },
      nextImage: button(updateImages),
      reload: button(() => ref.current?.reset()),
      splash: button(() => ref.current?.move(400, 300, 12)),
    },
    { store }
  );

  return (
    <DemoWrapper store={store}>
      <FluidImage ref={ref} src={urls[0]} effect={0} imageSize={imageSize} {...args} />
    </DemoWrapper>
  );
}
