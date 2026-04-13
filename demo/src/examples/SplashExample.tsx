import { useEffect, useRef, useState } from 'react';
import { useControls, button, useCreateStore, LevaPanel } from 'leva';
import { FluidText, type FluidHandle } from 'fluidity-js';
import { WORDS } from '../constants';

// ---------------------------------------------------------------------------
// Lorenz attractor generator
// Yields { x, y, z, dx, dy, dz } — position + instantaneous derivative.
// The caller drives the clock by sending dt via generator.next(dt).
// We expose dx/dy so callers can pass them as fluid velocity without recomputing.
// ---------------------------------------------------------------------------
interface LorenzState {
  x: number; y: number; z: number;
  dx: number; dy: number; dz: number;
}

function* createLorenzGenerator(
  initialPos: { x: number; y: number; z: number },
  params: { sigma: number; rho: number; beta: number }
): Generator<LorenzState, never, number> {
  let { x, y, z } = initialPos;

  while (true) {
    const dx = params.sigma * (y - x);
    const dy = x * (params.rho - z) - y;
    const dz = x * y - params.beta * z;

    const dt: number = yield { x, y, z, dx, dy, dz };

    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SplashExample() {
  const ref = useRef<FluidHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const store = useCreateStore();
  const lorenzRef = useRef(
    createLorenzGenerator({ x: 0.1, y: 0, z: 0 }, { sigma: 10, rho: 28, beta: 2.667 })
  );

  const [wordIdx, setWordIdx] = useState(0);

  const config = useControls('Lorenz Attractor', {
    running: true,
    speed:    { value: 0.012, min: 0.001, max: 0.04,  step: 0.001, label: 'Speed (dt)' },
    steps:    { value: 6,     min: 1,     max: 20,    step: 1,     label: 'Steps/frame' },
    scale:    { value: 14,    min: 2,     max: 40,    step: 0.5 },
    strength: { value: 0.08,  min: 0.01,  max: 0.4,   step: 0.01 },
    sigma:    { value: 10,    min: 0,     max: 25 },
    rho:      { value: 28,    min: 0,     max: 100 },
    beta:     { value: 2.667, min: 0,     max: 10,    label: 'Beta (8/3)' },
  }, { store });

  useControls('Actions', {
    'Next Word':      button(() => setWordIdx((i) => (i + 1) % WORDS.length)),
    'Reset Position': button(() => {
      lorenzRef.current = createLorenzGenerator(
        { x: 0.1, y: 0, z: 0 },
        { sigma: config.sigma, rho: config.rho, beta: config.beta }
      );
      lorenzRef.current.next(0); // prime
    }),
    'Clear Fluid':    button(() => ref.current?.reset()),
  }, { store });

  // Prime on mount
  useEffect(() => { lorenzRef.current.next(0); }, []);

  // ---------------------------------------------------------------------------
  // Animation loop
  // Uses ref.current.splat() — one call per sub-step, each with its own
  // position + velocity derived directly from the Lorenz derivatives.
  // This avoids the mouse-state-machine entirely and is safe to call N×/frame.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!config.running) return;

    let frameId: number;

    const animate = () => {
      const el = containerRef.current;
      const fluid = ref.current;

      if (el && fluid) {
        const { width, height } = el.getBoundingClientRect();
        const cx = width / 2;
        // Shift so the butterfly sits vertically centred (Z ranges ~0–50 for rho=28)
        const cy = height / 2 + config.rho * config.scale * 0.5;

        for (let i = 0; i < config.steps; i++) {
          const { value } = lorenzRef.current.next(config.speed);
          if (!value) continue;

          // Butterfly projection: X → screenX, Z → screenY (inverted)
          const sx = cx + value.x * config.scale;
          const sy = cy - value.z * config.scale;

          // Pass Lorenz derivatives as velocity — gives physically correct
          // "flow direction" trails matching the attractor's own momentum.
          // dx/dz are in attractor units; scale them to pixel-space.
          const vx = value.dx * config.scale * config.speed;
          const vy = -value.dz * config.scale * config.speed; // Z inverted above

          fluid.splat(sx, sy, vx, vy, config.strength);
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [config]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', position: 'relative', background: '#020202' }}
    >
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
        <LevaPanel store={store} fill flat titleBar={{ title: 'Lorenz Physics' }} />
      </div>

      <FluidText
        ref={ref}
        text={WORDS[wordIdx]}
        fontSize={160}
        color="#ffffff"
        isMouseEnabled={true}
        config={{
          shine: 0.12,
          refraction: 0.4,
          curl: 0.2,
          densityDissipation: 0.98,
          velocityDissipation: 0.97,
          glowColor: [0.1, 0.5, 1.0],
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
