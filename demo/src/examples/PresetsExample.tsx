import { useRef, useState } from 'react';
import { FluidText, type FluidHandle, type FluidConfig } from 'fluidity-js';
import { Panel, btnStyle, divider } from '../components/Panel';

type PresetKey = 'calm' | 'storm' | 'wave' | 'neon' | 'smoke';

const PRESETS: Record<PresetKey, { label: string; desc: string; text: string; color: string; config: Partial<FluidConfig> }> = {
  calm: {
    label: 'calm',
    desc: 'slow, peaceful drift',
    text: 'calm',
    color: '#a8d8ea',
    config: {
      densityDissipation: 0.999,
      velocityDissipation: 0.98,
      curl: 0.0001,
      splatRadius: 0.003,
      splatForce: 0.5,
      refraction: 0.15,
      shine: 0.005,
      glowColor: [0.6, 0.85, 1.0],
      waterColor: [0.0, 0.02, 0.05],
    },
  },
  storm: {
    label: 'storm',
    desc: 'violent, turbulent chaos',
    text: 'storm',
    color: '#ffffff',
    config: {
      densityDissipation: 0.97,
      velocityDissipation: 0.88,
      curl: 0.45,
      splatRadius: 0.012,
      splatForce: 3.0,
      refraction: 0.6,
      shine: 0.08,
      glowColor: [0.2, 0.3, 0.8],
      waterColor: [0.0, 0.0, 0.1],
    },
  },
  wave: {
    label: 'wave',
    desc: 'rolling vortex eddies',
    text: 'wave',
    color: '#e0f0ff',
    config: {
      densityDissipation: 0.994,
      velocityDissipation: 0.92,
      curl: 0.2,
      splatRadius: 0.005,
      splatForce: 1.2,
      refraction: 0.35,
      shine: 0.03,
      pressureIterations: 30,
      glowColor: [0.5, 0.8, 1.0],
      waterColor: [0.0, 0.01, 0.03],
    },
  },
  neon: {
    label: 'neon',
    desc: 'vivid glowing highlights',
    text: 'neon',
    color: '#ff2d9b',
    config: {
      densityDissipation: 0.985,
      velocityDissipation: 0.93,
      curl: 0.05,
      splatRadius: 0.008,
      splatForce: 1.5,
      refraction: 0.25,
      specularExp: 0.5,
      shine: 0.14,
      glowColor: [1.0, 0.2, 0.8],
      waterColor: [0.05, 0.0, 0.08],
    },
  },
  smoke: {
    label: 'smoke',
    desc: 'dense, rising smoke',
    text: 'smoke',
    color: '#cccccc',
    config: {
      densityDissipation: 0.996,
      velocityDissipation: 0.97,
      curl: 0.04,
      splatRadius: 0.009,
      splatForce: 0.8,
      refraction: 0.08,
      shine: 0.0,
      glowColor: [0.5, 0.5, 0.5],
      waterColor: [0.06, 0.06, 0.06],
    },
  },
};

export function PresetsExample() {
  const ref = useRef<FluidHandle>(null);
  const [active, setActive] = useState<PresetKey>('wave');
  const preset = PRESETS[active];

  const apply = (key: PresetKey) => {
    setActive(key);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <FluidText
        ref={ref}
        key={active}
        text={preset.text}
        fontSize={150}
        color={preset.color}
        config={preset.config}
        style={{ width: '100%', height: '100%' }}
      />

      <Panel>
        <span style={{ color: '#555' }}>preset</span>
        {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
          <button
            key={key}
            style={{
              ...btnStyle,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '5px 10px',
              borderColor: active === key ? '#5b8ff9' : undefined,
              color: active === key ? '#5b8ff9' : undefined,
              gap: 1,
            }}
            onClick={() => apply(key)}
          >
            <span>{PRESETS[key].label}</span>
            <span style={{ color: '#555', fontSize: 10 }}>{PRESETS[key].desc}</span>
          </button>
        ))}
        <div style={divider} />
        <button style={btnStyle} onClick={() => ref.current?.reset()}>reset</button>
      </Panel>
    </div>
  );
}
