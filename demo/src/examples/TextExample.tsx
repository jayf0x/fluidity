import { useRef } from 'react';
import { useControls, button, useCreateStore, LevaPanel } from 'leva';
import { FluidText, type FluidHandle } from 'fluidity-js';
import { useFluidControls } from '../hooks/useFluidControls';

export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  useFluidControls(ref, store);

  const props = useControls(
    'settings',
    {
      text: { value: 'fluidity' },
      fontSize: { value: 130, min: 40, max: 220, step: 2 },
      color: '#ffffff',
      reset: button(() => ref.current?.reset()),
    },
    { store }
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LevaPanel store={store} />
      <FluidText ref={ref} {...props} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
