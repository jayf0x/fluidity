import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import Terminal from 'vite-plugin-terminal';

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [
    react(),
    // Terminal plugin only works in dev mode (virtual module not available in builds)
    command === 'serve' && Terminal({ console: 'terminal', output: ['terminal', 'console'] }),
  ],
  resolve: {
    // Point 'fluidity-js' imports directly at the source tree so the app
    // always reflects live changes without a separate build step.
    alias: {
      'fluidity-js': resolve(__dirname, '../src/index.js'),
    },
  },
}));
