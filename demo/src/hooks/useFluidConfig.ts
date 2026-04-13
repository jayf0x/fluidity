import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { FluidConfig, FluidHandle } from 'fluidity-js';

export function useFluidConfig(
  ref: RefObject<FluidHandle | null>,
  config: Partial<FluidConfig>
) {
  useEffect(() => {
    ref.current?.updateConfig(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, JSON.stringify(config)]);
}
