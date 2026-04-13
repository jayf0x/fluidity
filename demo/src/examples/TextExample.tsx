import { useRef } from 'react';
import { useControls, button } from 'leva';
import { FluidText, type FluidHandle } from 'fluidity-js';
import { useFluidControls } from '../hooks/useFluidControls';

export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  useFluidControls(ref);

  const { text, fontSize, color } = useControls('settings', {
    text:     { value: 'fluidity' },
    fontSize: { value: 130, min: 40, max: 220, step: 2 },
    color:    '#ffffff',
    reset:    button(() => ref.current?.reset()),
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <FluidText
        ref={ref}
        text={text}
        fontSize={fontSize}
        color={color}
        style={{ width: '100%', height: '100%', background: "red" }}
      />
    </div>
  );
}
