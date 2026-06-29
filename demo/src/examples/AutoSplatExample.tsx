import { useCallback, useEffect, useRef } from 'react';

import { FluidText } from 'fluidity-js';
import { useShowcaseStore } from 'frontis/react';
import { useControls } from 'leva';

import { useFluidControls } from '../hooks/useFluidControls';

const defaultConfig: Partial<FluidConfig> = {
  densityDissipation: 0.67,
  velocityDissipation: 0,
  curl: 0.0,
  splatRadius: 0.1,
  splatForce: 0.97,
  refraction: 0.57,
  specularExp: 0.04,
  shine: 0.01,
  warpStrength: 0.09,
  algorithm: 'ripple',
  waterColor: '#002d2e',
  glowColor: '#ff4c00',
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
        r = 18,
        b = 2.667;
      const dx = s * (p.y - p.x);
      const dy = p.x * (r - p.z) - p.y;
      const dz = p.x * p.y - b * p.z;
      return { x: p.x + dx * dt, y: p.y + dy * dt, z: p.z + dz * dt, vx: dx, vy: -dz };
    },
    project: (p, w, h) => ({
      sx: w / 2 + p.x * (h / 50),
      sy: h / 2 + 200 - p.z * (h / 50),
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

let hue = 0;

function hslToHex(h: number, s = 100, l = 50) {
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

function rotateColor() {
  hue = (hue + 0.1) % 360;
  return hslToHex(hue);
}

const effectNames = Object.keys(allEffects);

export const AutoSplatExample = () => {
  const ref = useRef<FluidHandle>(null);
  const stateRef = useRef<State>({ x: 0.1, y: 0, z: 0, vx: 0, vy: 0 });

  const args = useFluidControls(ref, defaultConfig);

  const { effect } = useControls(
    {
      effect: { value: effectNames[0], options: effectNames },
    },
    { store: useShowcaseStore() }
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

    // ref.current?.updateConfig({ glowColor: rotateColor() });
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

  return <FluidText ref={ref} text={effect} fontSize={200} {...args} />;
};
