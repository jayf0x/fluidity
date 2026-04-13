import { useEffect, useRef, useState } from 'react';
import { useControls, button, useCreateStore, LevaPanel } from 'leva';
import { FluidText, type FluidHandle } from 'fluidity-js';
import { useFluidControls } from '../hooks/useFluidControls';
import { WORDS } from '../constants';

export function SplashExample() {
  const ref = useRef<FluidHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const store = useCreateStore();
  useFluidControls(ref, store);

  const [running, setRunning] = useState(true);
  const [wordIdx, setWordIdx] = useState(0);

  const { rate, strength } = useControls('settings', {
    rate:     { value: 300,  min: 50,  max: 1000, step: 50 },
    strength: { value: 10,   min: 1,   max: 30,   step: 1 },
  }, { store });

  // Stale-closure-safe splat fn
  const splatFnRef = useRef<() => void>(() => {});
  useEffect(() => {
    splatFnRef.current = () => {
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      ref.current?.updateLocation({
        x: Math.random() * width,
        y: Math.random() * height,
        strength: strength * (0.5 + Math.random()),
      });
    };
  }, [strength]);

  useControls('actions', {
    'play / pause': button(() => setRunning((r) => !r)),
    'one shot':     button(() => splatFnRef.current()),
    'word →':       button(() => setWordIdx((i) => (i + 1) % WORDS.length)),
    reset:          button(() => ref.current?.reset()),
  }, { store });

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => splatFnRef.current(), rate);
    return () => clearInterval(id);
  }, [running, rate]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LevaPanel store={store} />
      <FluidText
        ref={ref}
        text={WORDS[wordIdx]}
        fontSize={150}
        color="#ffffff"
        config={{
          shine: 0.05,
          refraction: 0.4,
          curl: 0.08,
          densityDissipation: 0.98,
          velocityDissipation: 0.96,
          glowColor: [0.3, 0.6, 1.0],
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
