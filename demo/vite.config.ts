import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import Terminal from 'vite-plugin-terminal';

export default defineConfig(({ command }) => ({
  base: command === 'serve' || !process.env.GH_PAGES ? '/' : '/fluidity/',
  plugins: [
    react(),
    // Terminal plugin only works in dev mode (virtual module not available in builds)
    command === 'serve' && Terminal({ console: 'terminal', output: ['terminal', 'console'] }),
  ],
  resolve: {
    // `frontis` is linked via file:, which would otherwise let it resolve its
    // own React/Leva copy → duplicate React ("Invalid hook call"). Force a
    // single copy from the demo.
    dedupe: ['react', 'react-dom', 'leva'],
    // FLUIDITY_DIST=1 → resolve to the compiled dist (for testing the built package).
    // Default → src for live-reload dev.
    alias: {
      'fluidity-js': process.env.FLUIDITY_DIST
        ? resolve(__dirname, '../dist/index.js')
        : resolve(__dirname, '../src/index.js'),
    },
  },
}));
