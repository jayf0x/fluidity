// React components (primary API)
export { FluidText } from './react/FluidText';
export { FluidImage } from './react/FluidImage';

// Hooks — for custom canvas integration
export { useFluid } from './react/useFluid';

// Core classes — for framework-agnostic / vanilla usage
export { FluidController } from './fluid-controller';
export { FluidSimulation } from './core/simulation';

// Config utilities
export { DEFAULT_CONFIG, DEFAULT_PROPS, PRESETS, mergeConfig } from './core/config';

// Utilities
export { loadImageBitmap } from './core/textures';
