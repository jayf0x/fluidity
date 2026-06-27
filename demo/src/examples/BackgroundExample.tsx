import { useCallback, useEffect, useRef } from 'react';

import { FluidText } from 'fluidity-js';
import { useCreateStore } from 'leva';

import { DemoWrapper } from '../components/DemoWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

export const BackgroundExample = () => {
  const ref = useRef<FluidHandle>(null);
  const store = useCreateStore();
  const args = useFluidControls(ref, store);

  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const prev = lastPos.current;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (!prev) return;
    const vx = e.clientX - prev.x;
    const vy = e.clientY - prev.y;
    ref.current?.splat(e.clientX, e.clientY, vx, vy, 1);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [onPointerMove]);

  return (
    <DemoWrapper store={store}>
      {/* fluid runs behind all content — pointer drives splats via ref */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <FluidText ref={ref} mouseEnabled={false} text="fluidity" {...args} />
      </div>

      {/* foreground content layered on top */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '1rem',
          pointerEvents: 'none',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '3rem', margin: 0 }}>Background fluid</h1>
        <p style={{ opacity: 0.7, margin: 0 }}>
          Move your cursor — splats driven programmatically via <code>ref.splat()</code>
        </p>
      </div>
    </DemoWrapper>
  );
};
