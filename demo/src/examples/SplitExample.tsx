import { useMemo, useRef } from 'react';

import { FluidImage, FluidText } from 'fluidity-js';
import { useShowcaseStore } from 'frontis/react';
import { useControls } from 'leva';

import { useImages } from '../hooks/useImages';

type TextTileDef = FluidTextProps & {
  type: 'text';
};

type ImageTileDef = FluidImageProps & {
  type: 'image';
};

const TILES: Array<TextTileDef | ImageTileDef> = [
  {
    type: 'text',
    text: 'fluid',
    fontSize: 160,
    color: '#ff2d78',
    backgroundColor: '#08000f',
    algorithm: 'aurora',
    curl: 0.4,
    warpStrength: 0.24,
    glowColor: '#ff1a73',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#000000',
    algorithm: 'glass',
    refraction: 0.45,
    splatRadius: 0.13,
  },
  {
    type: 'text',
    text: 'wave',
    fontSize: 160,
    color: '#00e5ff',
    backgroundColor: '#00080f',
    algorithm: 'ripple',
    curl: 0.2,
    shine: 0.4,
    glowColor: '#00ccff',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#0a0a0a',
    densityDissipation: 0.75,
    splatForce: 0.24,
  },
  {
    type: 'text',
    text: 'ink',
    fontSize: 160,
    color: '#b980ff',
    backgroundColor: '#06000e',
    algorithm: 'ink',
    densityDissipation: 0.8,
    curl: 0.15,
    glowColor: '#994dff',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#000000',
    algorithm: 'aurora',
    warpStrength: 0.21,
    curl: 0.35,
  },
  {
    type: 'text',
    text: 'glow',
    fontSize: 160,
    color: '#ffaa00',
    backgroundColor: '#0d0700',
    algorithm: 'standard',
    preset: 'neon',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#0a0a0a',
    algorithm: 'standard',
    curl: 0.35,
    splatRadius: 0.1,
  },
  {
    type: 'text',
    text: 'calm',
    fontSize: 160,
    color: '#4fffb0',
    backgroundColor: '#000d08',
    algorithm: 'standard',
    preset: 'calm',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#000000',
    algorithm: 'ripple',
    shine: 0.27,
    refraction: 0.35,
  },
  {
    type: 'text',
    text: 'sand',
    fontSize: 160,
    color: '#ff8c42',
    backgroundColor: '#0d0500',
    algorithm: 'standard',
    preset: 'sand',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#0a0a0a',
    algorithm: 'ink',
    densityDissipation: 0.87,
    splatForce: 0.29,
  },
  {
    type: 'text',
    text: 'ice',
    fontSize: 160,
    color: '#a0d8ef',
    backgroundColor: '#00060e',
    algorithm: 'ripple',
    preset: 'wave',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#000000',
    algorithm: 'aurora',
    warpStrength: 0.29,
    curl: 0.45,
  },
  {
    type: 'text',
    text: 'haze',
    fontSize: 160,
    color: '#cccccc',
    backgroundColor: '#080808',
    algorithm: 'standard',
    preset: 'smoke',
  },
  {
    type: 'image',
    src: '',
    backgroundColor: '#000000',
    algorithm: 'glass',
    refraction: 0.55,
    curl: 0.2,
  },
];

export function SplitExample() {
  const refs = useRef<Array<FluidHandle | null>>(Array(TILES.length).fill(null));

  const { count } = useControls(
    {
      count: {
        label: 'tiles',
        value: 4,
        min: 2,
        max: TILES.length,
        step: 1,
      },
    },
    { store: useShowcaseStore() }
  );

  const { urls, updateImages } = useImages(count);

  // column count derived from tile count so the grid stays roughly square
  const cols = useMemo(() => Math.max(2, Math.ceil(Math.sqrt(count))), [count]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: '1fr',
      }}
    >
      {TILES.slice(0, count).map((tile, i) =>
        tile.type === 'text' ? (
          <FluidText
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            {...tile}
          />
        ) : (
          <FluidImage
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            {...tile}
            src={urls[i]}
          />
        )
      )}
    </div>
  );
}

