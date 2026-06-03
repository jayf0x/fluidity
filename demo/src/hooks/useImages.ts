import { useRef, useState } from 'react';

export const ALL_IMAGES = [
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab',
  'https://images.unsplash.com/photo-1613645695025-20e3f38de4a6',
  'https://images.unsplash.com/photo-1663180575542-653ac6904a85',
  'https://plus.unsplash.com/premium_photo-1669814666151-c254da68476f',
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0',

  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc',
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
  'https://images.unsplash.com/photo-1439405326854-014607f694d7',
  'https://images.unsplash.com/photo-1531366936337-7c912a4589a7',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
];

export const useImages = (count = 1) => {
  const [startIndex, setStartIndex] = useState(0);

  const updateImages = () => {
    setStartIndex((prev) => (prev + 1) % ALL_IMAGES.length);
  };

  const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth * window.devicePixelRatio;

  // Each image only needs a fraction of the viewport width.
  const width = Math.ceil(Math.min(viewportWidth / 2, 2000));

  const urls = Array.from({ length: count }, (_, i) => {
    const index = (startIndex + i) % ALL_IMAGES.length;
    return `${ALL_IMAGES[index]}?w=${width}&q=20&auto=format&fit=max`;
  });

  return {
    updateImages,
    urls,
  };
};
