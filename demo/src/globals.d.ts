import type { FluidConfig } from 'fluidity-js';

declare global {
  type FluidConfigLeva = Omit<FluidConfig, 'waterColor' | 'glowColor'> & { waterColor: string; glowColor: string };
}

export {};
