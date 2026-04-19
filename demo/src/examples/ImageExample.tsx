import { useRef } from 'react';

import { FluidImage } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaultProps: Partial<FluidConfigLeva> = {
  densityDissipation: 0.99,
  velocityDissipation: 0.99,
  pressureIterations: 21.0,
  curl: 0.0,
  splatRadius: 0.005,
  splatForce: 0.5,
  refraction: 1.0,
  specularExp: 0.1,
  shine: 0.0,
  warpStrength: 0.005,
  algorithm: 'aurora',
};

const IMAGE_OPTIONS = {
  abstract: 'https://images.unsplash.com/photo-1652119482620-505b32c669b1?w=1600',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600',
  ocean: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600',
  fox: 'preview.png',
};

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const { preset, backgroundColor } = useFluidControls(ref, store, defaultProps);

  const { src, imageSize } = useControls(
    'settings',
    {
      src: { label: 'image', options: IMAGE_OPTIONS, value: IMAGE_OPTIONS['forest'] },
      imageSize: { label: 'size', options: ['cover', 'contain', '80%', '50%'], value: 'cover' },
      reload: button(() => ref.current?.reset()),
      splash: button(() => ref.current?.updateLocation({ x: 400, y: 300, strength: 12 })),
    },
    { store }
  );

  return (
    <ExampleWrapper store={store}>
      <FluidImage
        ref={ref}
        src={src}
        effect={0}
        imageSize={imageSize}
        preset={preset}
        backgroundColor={backgroundColor}
      />
    </ExampleWrapper>
  );
}
