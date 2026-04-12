import { useRef, useState } from 'react';
import { FluidText, FluidImage, type FluidHandle } from 'fluidity-js';

const DEMO_IMAGE = 'https://images.unsplash.com/photo-1652119482620-505b32c669b1';

export function App() {
  const textRef = useRef<FluidHandle>(null);
  const imageRef = useRef<FluidHandle>(null);
  const [shine, setShine] = useState(0.01);
  const [text, setText] = useState('fluidity');

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: '1fr 1fr' }}>

      {/* ── FluidText demo ─────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <FluidText
          ref={textRef}
          text={text}
          fontSize={120}
          color="#ffffff"
          config={{ shine, refraction: 0.3, glowColor: [0.4, 0.7, 1.0] }}
          style={{ width: '100%', height: '100%' }}
        />
        <Controls label="FluidText">
          <label style={labelStyle}>
            Text
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Shine: {shine.toFixed(3)}
            <input
              type="range" min={0} max={0.15} step={0.005}
              value={shine}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setShine(v);
                textRef.current?.updateConfig({ shine: v });
              }}
              style={{ width: 120 }}
            />
          </label>
          <button style={btnStyle} onClick={() => textRef.current?.reset()}>Reset</button>
        </Controls>
      </div>

      {/* ── FluidImage demo ─────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <FluidImage
          ref={imageRef}
          src={DEMO_IMAGE}
          effect={0.4}
          config={{ splatRadius: 0.006, velocityDissipation: 0.95 }}
          style={{ width: '100%', height: '100%' }}
        />
        <Controls label="FluidImage">
          <button style={btnStyle} onClick={() => imageRef.current?.reset()}>Reload Image</button>
          <button
            style={btnStyle}
            onClick={() => imageRef.current?.updateConfig({ curl: 0.5 })}
          >
            Boost Curl
          </button>
          <button
            style={btnStyle}
            onClick={() => imageRef.current?.updateLocation({ x: 200, y: 100, strength: 8 })}
          >
            Splash
          </button>
        </Controls>
      </div>

    </div>
  );
}

// ── tiny helpers ────────────────────────────────────────────────────────────

function Controls({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12,
      display: 'flex', gap: 8, alignItems: 'center',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      borderRadius: 8, padding: '6px 10px',
      color: '#ccc', fontSize: 12, fontFamily: 'monospace',
    }}>
      <span style={{ color: '#888', marginRight: 4 }}>{label}</span>
      {children}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, border: '1px solid #444',
  background: '#1a1a1a', color: '#ddd', cursor: 'pointer', fontSize: 11,
};
const labelStyle: React.CSSProperties = {
  display: 'flex', gap: 6, alignItems: 'center',
};
const inputStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #444', color: '#ddd',
  borderRadius: 4, padding: '2px 6px', width: 100, fontSize: 11,
};
