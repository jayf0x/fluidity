import { useCallback, useEffect, useRef } from 'react';

import { DEFAULT_CONFIG, FluidText } from 'fluidity-js';

import { useFluidControls } from '../hooks/useFluidControls';

const defaults: Partial<FluidConfig> = {
  ...DEFAULT_CONFIG,
  algorithm: 'aurora',
  waterColor: '#0d1b2a',
  glowColor: '#7b2fff',
  curl: 0.4,
  splatRadius: 0.15,
  splatForce: 0.8,
  shine: 0.3,
};

export const BackgroundExample = () => {
  const ref = useRef<FluidHandle>(null);
  const args = useFluidControls(ref, defaults);

  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const prev = lastPos.current;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (!prev) return;
    ref.current?.splat(e.clientX, e.clientY, e.clientX - prev.x, e.clientY - prev.y, 1);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [onPointerMove]);

  return (
    <>
      {/* fluid as full-screen background, driven by ref — no internal mouse handling */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <FluidText ref={ref} mouseEnabled={false} text="🐔 or 🥚" {...args} />
      </div>

      {/* modal card with backdrop filter over the fluid */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '1rem',
            padding: '2.5rem 3rem',
            color: 'white',
            textAlign: 'center',
            height: 'fit-content',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem' }}>Fluid as background</h2>
          <p style={{ margin: '0 0 1.25rem', opacity: 0.7, lineHeight: 1.6 }}>
            Move your cursor — splats are driven programmatically via <code>ref.splat()</code>, with{' '}
            <code>mouseEnabled={'{false}'}</code> on the canvas.
          </p>
          <a
            href="https://jayf0x.github.io/"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#a78bfa', textDecoration: 'underline', fontSize: '0.9rem' }}
          >
            See a real-world example →
          </a>
        </div>
      </div>
    </>
  );
};
