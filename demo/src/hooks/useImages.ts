import { useRef, useState } from 'react';

export const ALL_IMAGES = [
  'https://images.unsplash.com/photo-1636690598773-c50645a47aeb',
  'https://images.unsplash.com/photo-1643453157662-73ea35e3a1a8',
  'https://images.unsplash.com/flagged/photo-1572392640988-ba48d1a74457',
  'https://images.unsplash.com/photo-1613645695025-20e3f38de4a6',
  // 'https://images.unsplash.com/photo-1707861107128-9117f3ba988',
  'https://images.unsplash.com/photo-1554428744-3b88934a46f2',
  // 'https://images.unsplash.com/photo-1663180575542-653ac6904a85',
  'https://plus.unsplash.com/premium_photo-1684979565684-e350fc89a29d',
  'https://images.unsplash.com/photo-1507876466758-bc54f384809c',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab',
  'https://images.unsplash.com/photo-1561948955-570b270e7c36',
];

export const useImages = (count = 1, quality = 1) => {
  const [startIndex, setStartIndex] = useState(0);

  const updateImages = () => setStartIndex((prev) => (prev + 1) % ALL_IMAGES.length);

  const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth * window.devicePixelRatio;

  // Each image only needs a fraction of the viewport width.
  const width = Math.ceil(Math.min(viewportWidth / 2, 2000)) * quality;

  const urls = Array.from({ length: count }, (_, i) => {
    const index = (startIndex + i) % ALL_IMAGES.length;
    return `${ALL_IMAGES[index]}?w=${width}&q=20&auto=format&fit=max`;
  });

  return {
    updateImages,
    urls,
  };
};
