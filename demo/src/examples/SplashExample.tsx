import { useCallback, useEffect, useRef } from 'react';

import { type FluidHandle, FluidText } from 'fluidity-js';
import { useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { useFluidControls } from '../hooks/useFluidControls';

const defaultConfig: FluidConfigLeva = {
  densityDissipation: 0.98,
  velocityDissipation: 0.84,
  pressureIterations: 60,
  curl: 0.0001,
  splatRadius: 0.01,
  splatForce: 4.86,
  refraction: 0.57,
  specularExp: 0.5,
  shine: 0.01,
  warpStrength: 0.0,
  algorithm: 'ripple',
  waterColor: '#00f5ff',
  glowColor: '#642df7',
};

interface State {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
}

const allEffects: Record<
  string,
  {
    step: (p: State) => State;
    project: (p: State, w: number, h: number) => { sx: number; sy: number; svx: number; svy: number };
  }
> = {
  Lorenz: {
    step: (p) => {
      const dt = 0.012,
        s = 10,
        r = 28,
        b = 2.667;
      const dx = s * (p.y - p.x);
      const dy = p.x * (r - p.z) - p.y;
      const dz = p.x * p.y - b * p.z;
      return { x: p.x + dx * dt, y: p.y + dy * dt, z: p.z + dz * dt, vx: dx, vy: -dz };
    },
    project: (p, w, h) => ({
      sx: w / 2 + p.x * (h / 70),
      sy: h / 2 + 200 - p.z * (h / 70),
      svx: p.vx * 0.5,
      svy: p.vy * 0.5,
    }),
  },
  Rossler: {
    step: (p) => {
      const dt = 0.04,
        a = 0.3,
        b = 0.2,
        c = 5.7;
      const dx = -p.y - p.z;
      const dy = p.x + a * p.y;
      const dz = b + p.z * (p.x - c);
      return { x: p.x + dx * dt, y: p.y + dy * dt, z: p.z + dz * dt, vx: dx, vy: dy };
    },
    project: (p, w, h) => ({
      sx: w / 2 + p.x * (h / 60),
      sy: h / 2 - p.y * (h / 60),
      svx: p.vx * 2,
      svy: p.vy * 2,
    }),
  },
  Spiral: {
    step: (p) => {
      const theta = p.z + 0.05;
      const r = 180 + Math.sin(theta * 2) * 40;
      const tx = Math.cos(theta) * r;
      const ty = Math.sin(theta) * r;
      return { x: tx, y: ty, z: theta, vx: tx - p.x, vy: ty - p.y };
    },
    project: (p, w, h) => ({
      sx: w / 2 + p.x,
      sy: h / 2 + p.y,
      svx: p.vx * 0.8,
      svy: p.vy * 0.8,
    }),
  },
};

const effectNames = Object.keys(allEffects);

export function SplashExample() {
  const ref = useRef<FluidHandle>(null);
  const stateRef = useRef<State>({ x: 0.1, y: 0, z: 0, vx: 0, vy: 0 });
  const store = useCreateStore();

  useFluidControls(ref, store, defaultConfig);

  const { effect } = useControls(
    {
      effect: { value: effectNames[0], options: effectNames },
    },
    { store }
  );

  useEffect(() => {
    // Reset state on effect change to prevent coordinate explosions
    stateRef.current = { x: 0.1, y: 0, z: 0, vx: 0, vy: 0 };
  }, [effect]);

  const animate = useCallback(() => {
    const { innerWidth: w, innerHeight: h } = window;
    const engine = allEffects[effect];

    stateRef.current = engine.step(stateRef.current);
    const { sx, sy, svx, svy } = engine.project(stateRef.current, w, h);

    ref.current?.splat(sx, sy, svx, svy, 1);
  }, [effect]);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      animate();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [animate]);

  return (
    <ExampleWrapper store={store}>
      <FluidText ref={ref} text={effect} fontSize={200} />
    </ExampleWrapper>
  );
}
