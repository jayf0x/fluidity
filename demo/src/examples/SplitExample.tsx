import { useRef } from 'react';
import { useControls, button, useCreateStore, LevaPanel } from 'leva';
import { FluidText, FluidImage, type FluidHandle, type FluidAlgorithm } from 'fluidity-js';
import { useFluidConfig } from '../hooks/useFluidConfig';
import { SPLIT_IMAGE_SRC } from '../constants';

const ALGORITHMS: FluidAlgorithm[] = ['standard', 'glass', 'ink', 'aurora', 'ripple'];

export function SplitExample() {
  const textRef = useRef<FluidHandle>(null);
  const imageRef = useRef<FluidHandle>(null);
  const store = useCreateStore();

  const { text, textShine, imgEffect, imgAlgorithm } = useControls(
    'settings',
    {
      text: { value: 'split' },
      textShine: { label: 'text shine', value: 0.02, min: 0, max: 0.15, step: 0.001 },
      imgEffect: { label: 'img effect', value: 0.4, min: 0, max: 1, step: 0.01 },
      // TODO CORE/BUG: remove dummy from core cursor effect — algorithm selector for comparing render modes
      imgAlgorithm: { label: 'img fx', options: ALGORITHMS, value: 'standard' as FluidAlgorithm },
    },
    { store }
  );

  useControls(
    'actions',
    {
      'reset text': button(() => textRef.current?.reset()),
      'reset img': button(() => imageRef.current?.reset()),
    },
    { store }
  );

  useFluidConfig(textRef, { shine: textShine });
  useFluidConfig(imageRef, { algorithm: imgAlgorithm as FluidAlgorithm });

  return (
    <div
      style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}
    >
      <LevaPanel store={store} />

      {/* left: FluidText, isWorkerEnabled=false */}
      <div style={{ position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <FluidText
          ref={textRef}
          text={text}
          fontSize={100}
          color="#ffffff"
          isWorkerEnabled={false}
          config={{ shine: textShine, refraction: 0.25, glowColor: [0.4, 0.7, 1.0] }}
          style={{ width: '100%', height: '100%' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 10,
            color: '#444',
            fontFamily: 'ui-monospace, monospace',
            pointerEvents: 'none',
          }}
        >
          FluidText · isWorkerEnabled=false
        </div>
      </div>

      {/* right: FluidImage, isWorkerEnabled=false */}
      <div style={{ position: 'relative' }}>
        <FluidImage
          ref={imageRef}
          src={SPLIT_IMAGE_SRC}
          effect={imgEffect}
          isWorkerEnabled={false}
          config={{ splatRadius: 0.007, velocityDissipation: 0.94 }}
          style={{ width: '100%', height: '100%' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 10,
            color: '#444',
            fontFamily: 'ui-monospace, monospace',
            pointerEvents: 'none',
          }}
        >
          FluidImage · isWorkerEnabled=false · fx: {imgAlgorithm}
        </div>
      </div>
    </div>
  );
}
