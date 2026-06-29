import { useRef } from 'react';

import { FluidImage } from 'fluidity-js';
import { defineShowcase } from 'frontis';
import { button, useControls } from 'leva';

import { useFluidControls } from '../hooks/useFluidControls';
import { useImages } from '../hooks/useImages';

const defaults: Partial<FluidConfig> = {
  splatForce: 0.9,
  splatRadius: 0.01,
};

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const args = useFluidControls(ref, defaults);

  const { imageQuality } = useControls('settings', {
    imageQuality: { value: 1, min: 0.1, max: 3, step: 0.1 },
  });

  const { urls, updateImages } = useImages(1, imageQuality);
  const { imageSize } = useControls('settings', {
    imageSize: { label: 'size', options: ['cover', 'contain', '80%', '50%'], value: 'cover' },
    nextImage: button(updateImages),
    reload: button(() => ref.current?.reset()),
    splash: button(() => ref.current?.move(400, 300, 12)),
  });

  return <FluidImage ref={ref} src={urls[0]} effect={0} imageSize={imageSize} {...args} />;
}

defineShowcase({ id: 'image', title: 'image', category: 'Demos', component: ImageExample });
