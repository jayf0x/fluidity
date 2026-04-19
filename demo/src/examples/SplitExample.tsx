import { useRef } from 'react';

import { FluidImage, FluidText } from 'fluidity-js';
import { button, useControls, useCreateStore } from 'leva';

import { ExampleWrapper } from '../components/ExampleWrapper';
import { useFluidConfig } from '../hooks/useFluidConfig';
import { useFluidControls } from '../hooks/useFluidControls';
import { IMAGE_OPTIONS } from './ImageExample';

const ALGORITHMS: FluidAlgorithm[] = ['standard', 'glass', 'ink', 'aurora', 'ripple'];

382030;

export function SplitExample() {
  const textRef = useRef<FluidHandle>(null);
  const imageRef = useRef<FluidHandle>(null);
  const store = useCreateStore();

  const controlsText = useFluidControls(textRef, store);
  const controlsImg = useFluidControls(imageRef, store);

  useFluidConfig(textRef);
  useFluidConfig(imageRef);

  return (
    <ExampleWrapper store={store}>
      <div
        style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}
      >
        {/* left: FluidText, isWorkerEnabled=false */}
        <div style={{ position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <FluidText
            ref={textRef}
            text="Supercalifragilisticexpialidocious"
            fontSize={200}
            color="#ffffff"
            backgroundColor=""
            // isWorkerEnabled={false}
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
            src={IMAGE_OPTIONS.forest}
            // isWorkerEnabled={false}
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
            FluidImage · isWorkerEnabled=false
          </div>
        </div>
      </div>
    </ExampleWrapper>
  );
}
