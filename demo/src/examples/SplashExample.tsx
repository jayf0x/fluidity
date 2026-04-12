import { useEffect, useRef, useState } from 'react';
import { FluidText, type FluidHandle } from 'fluidity-js';
import { Panel, Row, rangeStyle, btnStyle, divider } from '../components/Panel';

const WORDS = ['fluidity', 'liquid', 'flow', 'drift', 'ripple', 'wave', 'surge', 'flux'];

export function SplashExample() {
  const ref = useRef<FluidHandle>(null);
  const [running, setRunning] = useState(true);
  const [rate, setRate] = useState(300);
  const [strength, setStrength] = useState(10);
  const [wordIdx, setWordIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const splat = () => {
    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const x = Math.random() * width;
    const y = Math.random() * height;
    ref.current?.updateLocation({ x, y, strength: strength * (0.5 + Math.random()) });
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(splat, rate);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, rate, strength]);

  const nextWord = () => setWordIdx((i) => (i + 1) % WORDS.length);

  return (
    <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
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

      <Panel>
        <Row label={`rate ${rate}ms`}>
          <input
            type="range" min={50} max={1000} step={50}
            value={rate}
            onChange={(e) => setRate(+e.target.value)}
            style={rangeStyle}
          />
        </Row>
        <Row label={`strength ${strength}`}>
          <input
            type="range" min={1} max={30} step={1}
            value={strength}
            onChange={(e) => setStrength(+e.target.value)}
            style={rangeStyle}
          />
        </Row>
        <div style={divider} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={btnStyle} onClick={() => setRunning((r) => !r)}>
            {running ? 'pause' : 'play'}
          </button>
          <button style={btnStyle} onClick={splat}>one shot</button>
          <button style={btnStyle} onClick={nextWord}>word →</button>
          <button style={btnStyle} onClick={() => ref.current?.reset()}>reset</button>
        </div>
      </Panel>
    </div>
  );
}
