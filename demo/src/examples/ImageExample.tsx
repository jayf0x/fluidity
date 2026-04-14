import { useRef } from 'react';

import { type FluidHandle, FluidImage } from 'fluidity-js';
import { LevaPanel, button, useControls, useCreateStore } from 'leva';

import { IMAGES } from '../constants';
import { useFluidControls } from '../hooks/useFluidControls';

const IMAGE_OPTIONS = Object.fromEntries(IMAGES.map((img) => [img.label, img.src]));

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  useFluidControls(ref, store);

  const { src, imageSize, effect } = useControls(
    'settings',
    {
      src: { label: 'image', options: IMAGE_OPTIONS, value: IMAGES[0].src },
      imageSize: { label: 'size', options: ['cover', 'contain', '80%', '50%'], value: 'cover' },
      effect: { value: 0.4, min: 0, max: 1, step: 0.01 },
      reload: button(() => ref.current?.reset()),
      splash: button(() => ref.current?.updateLocation({ x: 400, y: 300, strength: 12 })),
    },
    { store }
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LevaPanel store={store} />
      <FluidImage ref={ref} src={src} effect={effect} imageSize={imageSize} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
