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
  a: 'https://images.unsplash.com/photo-1613645695025-20e3f38de4a6?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  abstract: 'https://images.unsplash.com/photo-1652119482620-505b32c669b1?w=1600',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600',
  ocean: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600',
  fox: 'preview.png',
};

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const { preset, backgroundColor, quality } = useFluidControls(ref, store, defaultProps);

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
      <FluidImage
        ref={ref}
        src={src}
        effect={0}
        imageSize={imageSize}
        preset={preset}
        backgroundColor={backgroundColor}
        quality={quality}
      />
    </DemoWrapper>
  );
}
