import { useRef } from 'react';

import { type FluidHandle, FluidImage } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaultProps: Partial<FluidConfigLeva> = {
  densityDissipation: 0.99,
  velocityDissipation: 0.93,
  pressureIterations: 3.0,
  curl: 0.0,
  splatRadius: 0.0,
  splatForce: 1.18,
  refraction: 1.0,
  specularExp: 0.1,
  shine: 0.0,
  warpStrength: 0.01,
};

const IMAGE_OPTIONS = {
  abstract: 'https://images.unsplash.com/photo-1652119482620-505b32c669b1?w=1600',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600',
  ocean: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600',
  city: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600',
};

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  useFluidControls(ref, store, defaultProps);

  const { src, imageSize, effect } = useControls(
    'settings',
    {
      src: { label: 'image', options: IMAGE_OPTIONS, value: IMAGE_OPTIONS['forest'] },
      imageSize: { label: 'size', options: ['cover', 'contain', '80%', '50%'], value: 'cover' },
      effect: { value: 0.4, min: 0, max: 1, step: 0.01 },
      reload: button(() => ref.current?.reset()),
      splash: button(() => ref.current?.updateLocation({ x: 400, y: 300, strength: 12 })),
    },
    { store }
  );

  return (
    <ExampleWrapper store={store}>
      <FluidImage ref={ref} src={src} effect={effect} imageSize={imageSize} />
    </ExampleWrapper>
  );
}
