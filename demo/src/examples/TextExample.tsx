import { useRef, useState } from 'react';
import { FluidText, type FluidHandle } from 'fluidity-js';
import { Panel, Row, inputStyle, rangeStyle, btnStyle, divider } from '../components/Panel';

export function TextExample() {
  const ref = useRef<FluidHandle>(null);
  const [text, setText] = useState('fluidity');
  const [fontSize, setFontSize] = useState(130);
  const [color, setColor] = useState('#ffffff');
  const [shine, setShine] = useState(0.01);
  const [refraction, setRefraction] = useState(0.3);
  const [curl, setCurl] = useState(0.0001);
  const [glowR, setGlowR] = useState(0.4);
  const [glowG, setGlowG] = useState(0.7);
  const [glowB, setGlowB] = useState(1.0);

  const updateCfg = (patch: object) => ref.current?.updateConfig(patch as never);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <FluidText
        ref={ref}
        text={text}
        fontSize={fontSize}
        color={color}
        config={{
          shine,
          refraction,
          curl,
          glowColor: [glowR, glowG, glowB],
        }}
        style={{ width: '100%', height: '100%' }}
      />

      <Panel>
        <Row label="text">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={inputStyle}
          />
        </Row>
        <Row label="color">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ ...inputStyle, padding: 2, height: 24 }}
          />
        </Row>
        <Row label={`font size ${fontSize}`}>
          <input
            type="range" min={40} max={220} step={2}
            value={fontSize}
            onChange={(e) => setFontSize(+e.target.value)}
            style={rangeStyle}
          />
        </Row>
        <div style={divider} />
        <Row label={`shine ${shine.toFixed(3)}`}>
          <input
            type="range" min={0} max={0.15} step={0.001}
            value={shine}
            onChange={(e) => { const v = +e.target.value; setShine(v); updateCfg({ shine: v }); }}
            style={rangeStyle}
          />
        </Row>
        <Row label={`refraction ${refraction.toFixed(2)}`}>
          <input
            type="range" min={0} max={1} step={0.01}
            value={refraction}
            onChange={(e) => { const v = +e.target.value; setRefraction(v); updateCfg({ refraction: v }); }}
            style={rangeStyle}
          />
        </Row>
        <Row label={`curl ${curl.toFixed(4)}`}>
          <input
            type="range" min={0} max={0.5} step={0.001}
            value={curl}
            onChange={(e) => { const v = +e.target.value; setCurl(v); updateCfg({ curl: v }); }}
            style={rangeStyle}
          />
        </Row>
        <div style={divider} />
        <span style={{ color: '#555' }}>glow RGB</span>
        <Row label={`R ${glowR.toFixed(2)}`}>
          <input type="range" min={0} max={1} step={0.01} value={glowR}
            onChange={(e) => { const v = +e.target.value; setGlowR(v); updateCfg({ glowColor: [v, glowG, glowB] }); }}
            style={rangeStyle} />
        </Row>
        <Row label={`G ${glowG.toFixed(2)}`}>
          <input type="range" min={0} max={1} step={0.01} value={glowG}
            onChange={(e) => { const v = +e.target.value; setGlowG(v); updateCfg({ glowColor: [glowR, v, glowB] }); }}
            style={rangeStyle} />
        </Row>
        <Row label={`B ${glowB.toFixed(2)}`}>
          <input type="range" min={0} max={1} step={0.01} value={glowB}
            onChange={(e) => { const v = +e.target.value; setGlowB(v); updateCfg({ glowColor: [glowR, glowG, v] }); }}
            style={rangeStyle} />
        </Row>
        <div style={divider} />
        <button style={btnStyle} onClick={() => ref.current?.reset()}>reset</button>
      </Panel>
    </div>
  );
}
