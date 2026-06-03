import { useCreateStore } from 'leva';

declare global {
  type LevaStore = ReturnType<typeof useCreateStore>;

  type RGB = [number, number, number];
}

export {};
