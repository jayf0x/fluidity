import { useRef } from 'react';

import { FluidImage } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { DemoWrapper } from '../components/DemoWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaultProps: Partial<FluidConfigLeva> = {
  densityDissipation: 0.99,
  velocityDissipation: 0.99,
  curl: 0.0,
  splatRadius: 0.005,
  splatForce: 0.5,
  refraction: 1.0,
  specularExp: 0.1,
  shine: 0.0,
  warpStrength: 0.005,
  algorithm: 'aurora',
};

export const IMAGE_OPTIONS = {
  wall: 'https://images.unsplash.com/photo-1613645695025-20e3f38de4a6?q=80&w=2370',
  person: 'https://images.unsplash.com/photo-1663180575542-653ac6904a85?q=80&w=1287',
  lights: 'https://plus.unsplash.com/premium_photo-1669814666151-c254da68476f?q=80&w=2787',
  ocean: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600',
};

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const args = useFluidControls(ref, store, defaultProps);

  const { src, imageSize } = useControls(
    'settings',
    {
      src: { label: 'image', options: IMAGE_OPTIONS, value: Object.values(IMAGE_OPTIONS)[0] },
      imageSize: { label: 'size', options: ['cover', 'contain', '80%', '50%'], value: 'cover' },
      reload: button(() => ref.current?.reset()),
      splash: button(() => ref.current?.move(400, 300, 12)),
    },
    { store }
  );

  return (
    <DemoWrapper store={store}>
      <FluidImage ref={ref} src={src} effect={0} imageSize={imageSize} {...args} />
    </DemoWrapper>
  );
}
