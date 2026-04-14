import { useCallback, useEffect, useRef, useState } from 'react';
import { useControls, button, useCreateStore, LevaPanel } from 'leva';
import { FluidText, type FluidHandle } from 'fluidity-js';
import { useFluidControls } from '../hooks/useFluidControls';

const config = {
  speed: 0.012,
  sigma: 10,
  rho: 60,
  beta: 2.667,
};

const useResize = (ref: React.RefObject<HTMLDivElement>) => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setWidth(entry.contentRect.width);
        setHeight(entry.contentRect.height);
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [width, height];
};

// ---------------------------------------------------------------------------
// Lorenz attractor generator
// Yields { x, y, z, dx, dy, dz } — position + instantaneous derivative.
// The caller drives the clock by sending dt via generator.next(dt).
// We expose dx/dy so callers can pass them as fluid velocity without recomputing.
// ---------------------------------------------------------------------------
interface LorenzState {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
}

function* createLorenzGenerator(initialPos: {
  x: number;
  y: number;
  z: number;
}): Generator<LorenzState, never, number> {
  let { x, y, z } = initialPos;

  while (true) {
    const dx = config.sigma * (y - x);
    const dy = x * (config.rho - z) - y;
    const dz = x * y - config.beta * z;

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
  const lorenzRef = useRef(createLorenzGenerator({ x: 0.1, y: 0, z: 0 }));

  const store = useCreateStore();
  const [containerWidth, containerHeight] = useResize(containerRef);

  useFluidControls(ref, store);

  const params = useControls(
    'Actions',
    {
      text: { value: 'fluidity' },
    },
    { store }
  );

  // Prime on mount
  useEffect(() => {
    lorenzRef.current.next(0);
  }, []);

  const animate = useCallback(() => {
    const scale = containerHeight / 60;
    const cx = containerWidth / 2;
    // Shift so the butterfly sits vertically centred (Z ranges ~0–50 for rho=28)
    const cy = containerHeight / 2 + config.rho * scale * 0.5;

    const { value } = lorenzRef.current.next(config.speed);
    if (!value) return;

    // Butterfly projection: X → screenX, Z → screenY (inverted)
    const sx = cx + value.x * scale;
    const sy = cy - value.z * scale;

    // Pass Lorenz derivatives as velocity — gives physically correct
    // "flow direction" trails matching the attractor's own momentum.
    // dx/dz are in attractor units; scale them to pixel-space.
    const vx = value.dx * scale * config.speed;
    const vy = -value.dz * scale * config.speed; // Z inverted above

    ref.current?.splat(sx, sy, vx, vy, 2);
  }, [containerWidth, containerHeight, config]);

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      animate();
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [config, containerWidth, containerHeight]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh', position: 'relative', background: '#020202' }}>
      <LevaPanel store={store} />
      <FluidText
        ref={ref}
        {...params}
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
