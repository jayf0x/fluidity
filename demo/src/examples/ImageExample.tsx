import { useRef, useState } from 'react';
import { FluidImage, type FluidHandle } from 'fluidity-js';
import { Panel, Row, rangeStyle, btnStyle, divider, inputStyle } from '../components/Panel';

const IMAGES = [
  { label: 'abstract', src: 'https://images.unsplash.com/photo-1652119482620-505b32c669b1?w=1600' },
  { label: 'forest',   src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600' },
  { label: 'ocean',    src: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600' },
  { label: 'city',     src: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600' },
];

const SIZE_OPTIONS = ['cover', 'contain', '80%', '50%'] as const;

export function ImageExample() {
  const ref = useRef<FluidHandle>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [effect, setEffect] = useState(0.4);
  const [splatRadius, setSplatRadius] = useState(0.006);
  const [velocityDiss, setVelocityDiss] = useState(0.95);
  const [imageSize, setImageSize] = useState<string>('cover');
  const [customSize, setCustomSize] = useState('');

  const src = IMAGES[imgIdx].src;
  const resolvedSize = customSize || imageSize;

  const updateCfg = (patch: object) => ref.current?.updateConfig(patch as never);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <FluidImage
        ref={ref}
        src={src}
        effect={effect}
        imageSize={resolvedSize}
        config={{ splatRadius, velocityDissipation: velocityDiss }}
        style={{ width: '100%', height: '100%' }}
      />

      <Panel>
        <span style={{ color: '#555' }}>image</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {IMAGES.map((img, i) => (
            <button
              key={img.label}
              style={{
                ...btnStyle,
                borderColor: i === imgIdx ? '#5b8ff9' : undefined,
                color: i === imgIdx ? '#5b8ff9' : undefined,
              }}
              onClick={() => setImgIdx(i)}
            >
              {img.label}
            </button>
          ))}
        </div>
        <div style={divider} />
        <span style={{ color: '#555' }}>size</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SIZE_OPTIONS.map((s) => (
            <button
              key={s}
              style={{
                ...btnStyle,
                borderColor: imageSize === s && !customSize ? '#5b8ff9' : undefined,
                color: imageSize === s && !customSize ? '#5b8ff9' : undefined,
              }}
              onClick={() => { setImageSize(s); setCustomSize(''); }}
            >
              {s}
            </button>
          ))}
        </div>
        <Row label="custom">
          <input
            placeholder="e.g. 120px"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            style={inputStyle}
          />
        </Row>
        <div style={divider} />
        <Row label={`effect ${effect.toFixed(2)}`}>
          <input
            type="range" min={0} max={1} step={0.01}
            value={effect}
            onChange={(e) => setEffect(+e.target.value)}
            style={rangeStyle}
          />
        </Row>
        <Row label={`brush ${splatRadius.toFixed(4)}`}>
          <input
            type="range" min={0.001} max={0.03} step={0.001}
            value={splatRadius}
            onChange={(e) => { const v = +e.target.value; setSplatRadius(v); updateCfg({ splatRadius: v }); }}
            style={rangeStyle}
          />
        </Row>
        <Row label={`dissipation ${velocityDiss.toFixed(3)}`}>
          <input
            type="range" min={0.7} max={0.999} step={0.001}
            value={velocityDiss}
            onChange={(e) => { const v = +e.target.value; setVelocityDiss(v); updateCfg({ velocityDissipation: v }); }}
            style={rangeStyle}
          />
        </Row>
        <div style={divider} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnStyle} onClick={() => ref.current?.reset()}>reload</button>
          <button style={btnStyle} onClick={() => ref.current?.updateLocation({ x: 400, y: 300, strength: 12 })}>splash!</button>
        </div>
      </Panel>
    </div>
  );
}
