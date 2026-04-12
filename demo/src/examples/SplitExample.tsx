import { useRef, useState } from 'react';
import { FluidText, FluidImage, type FluidHandle } from 'fluidity-js';
import { Panel, Row, rangeStyle, btnStyle, divider } from '../components/Panel';

const IMAGE_SRC = 'https://images.unsplash.com/photo-1652119482620-505b32c669b1?w=1200';

export function SplitExample() {
  const textRef = useRef<FluidHandle>(null);
  const imageRef = useRef<FluidHandle>(null);
  const [text, setText_] = useState('split');
  const [textShine, setTextShine] = useState(0.02);
  const [imgEffect, setImgEffect] = useState(0.4);

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>

      {/* left: FluidText, worker=false */}
      <div style={{ position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <FluidText
          ref={textRef}
          text={text}
          fontSize={100}
          color="#ffffff"
          worker={false}
          config={{
            shine: textShine,
            refraction: 0.25,
            glowColor: [0.4, 0.7, 1.0],
          }}
          style={{ width: '100%', height: '100%' }}
        />
        <div style={{
          position: 'absolute', top: 12, left: 0, right: 0,
          textAlign: 'center', fontSize: 10, color: '#444',
          fontFamily: 'ui-monospace, monospace', pointerEvents: 'none',
        }}>
          FluidText · worker=false
        </div>
      </div>

      {/* right: FluidImage, worker=false */}
      <div style={{ position: 'relative' }}>
        <FluidImage
          ref={imageRef}
          src={IMAGE_SRC}
          effect={imgEffect}
          worker={false}
          config={{ splatRadius: 0.007, velocityDissipation: 0.94 }}
          style={{ width: '100%', height: '100%' }}
        />
        <div style={{
          position: 'absolute', top: 12, left: 0, right: 0,
          textAlign: 'center', fontSize: 10, color: '#444',
          fontFamily: 'ui-monospace, monospace', pointerEvents: 'none',
        }}>
          FluidImage · worker=false
        </div>
      </div>

      {/* shared panel */}
      <Panel position="bottom-right">
        <span style={{ color: '#555' }}>text</span>
        <Row label="content">
          <input
            value={text}
            onChange={(e) => setText_(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#eee', borderRadius: 5,
              padding: '2px 7px', width: 110, fontSize: 11,
              fontFamily: 'inherit',
            }}
          />
        </Row>
        <Row label={`shine ${textShine.toFixed(3)}`}>
          <input
            type="range" min={0} max={0.15} step={0.001}
            value={textShine}
            onChange={(e) => { const v = +e.target.value; setTextShine(v); textRef.current?.updateConfig({ shine: v }); }}
            style={rangeStyle}
          />
        </Row>
        <div style={divider} />
        <span style={{ color: '#555' }}>image</span>
        <Row label={`effect ${imgEffect.toFixed(2)}`}>
          <input
            type="range" min={0} max={1} step={0.01}
            value={imgEffect}
            onChange={(e) => setImgEffect(+e.target.value)}
            style={rangeStyle}
          />
        </Row>
        <div style={divider} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnStyle} onClick={() => textRef.current?.reset()}>reset text</button>
          <button style={btnStyle} onClick={() => imageRef.current?.reset()}>reset img</button>
        </div>
      </Panel>
    </div>
  );
}
