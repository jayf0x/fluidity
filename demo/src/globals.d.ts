import type { FluidConfig } from 'fluidity-js';
import { useCreateStore } from 'leva';

declare global {
  type FluidConfigLeva = Omit<FluidConfig, 'waterColor' | 'glowColor'> & { waterColor: string; glowColor: string };

  type LevaStore = ReturnType<typeof useCreateStore>;

  type RGB = [number, number, number];
}

export {};
