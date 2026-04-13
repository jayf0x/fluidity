// React components (primary API)
export { FluidText } from './react/FluidText.jsx';
export { FluidImage } from './react/FluidImage.jsx';

// Hooks — for custom canvas integration
export { useFluid } from './react/useFluid.js';

// Core classes — for framework-agnostic / vanilla usage
export { FluidController } from './fluid-controller.js';
export { FluidSimulation } from './core/simulation.js';

// Config utilities
export { DEFAULT_CONFIG, PRESETS, mergeConfig } from './core/config.js';
