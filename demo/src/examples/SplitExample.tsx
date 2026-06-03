import { useMemo, useRef } from 'react';

import { FluidImage, FluidText } from 'fluidity-js';
import { useControls, useCreateStore } from 'leva';

import { DemoWrapper } from '../components/DemoWrapper';

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
    src: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=900',
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
    shine: 0.40,
    glowColor: '#00ccff',
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900',
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
    densityDissipation: 0.80,
    curl: 0.15,
    glowColor: '#994dff',
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=900',
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
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900',
    backgroundColor: '#0a0a0a',
    algorithm: 'standard',
    curl: 0.35,
    splatRadius: 0.10,
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
    src: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?w=900',
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
    src: 'https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=900',
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
    src: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=900',
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
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900',
    backgroundColor: '#000000',
    algorithm: 'glass',
    refraction: 0.55,
    curl: 0.2,
  },
];

export function SplitExample() {
  const refs = useRef<Array<FluidHandle | null>>(Array(TILES.length).fill(null));
  const store = useCreateStore();

  const { count } = useControls({
    count: {
      label: 'tiles',
      value: 4,
      min: 2,
      max: TILES.length,
      step: 1,
    },
  });

  // column count derived from tile count so the grid stays roughly square
  const cols = useMemo(() => Math.max(2, Math.ceil(Math.sqrt(count))), [count]);

  return (
    <DemoWrapper store={store}>
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
            />
          )
        )}
      </div>
    </DemoWrapper>
  );
}
