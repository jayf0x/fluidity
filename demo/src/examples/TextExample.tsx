import { useRef } from 'react';

import { defineShowcase } from 'frontis';
import { DEFAULT_CONFIG_TEXT, FluidText } from 'fluidity-js';
import { button, useControls } from 'leva';

import { useFluidControls } from '../hooks/useFluidControls';

const defaults: FluidConfig = {
  ...DEFAULT_CONFIG_TEXT,
  shine: 0.1,
  glowColor: '#f00',
  waterColor: '#1e2b4c',
  splatRadius: 0.1,
  specularExp: 0.5,
};

// Rendered inside <Showcase> (App), so the Leva store comes from context.
export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const args = useFluidControls(ref, defaults);

  const props = useControls('settings', {
    text: { value: 'Fluidity' },
    fontSize: { value: 100 * window.devicePixelRatio, min: 100, max: 1200, step: 10 },
    reset: button(() => ref.current?.reset()),
  });

  return <FluidText ref={ref} fontFamily="Ubuntu" {...args} {...props} />;
}

defineShowcase({ id: 'text', title: 'text', category: 'Demos', component: TextExample });
