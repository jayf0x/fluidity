import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

const __dir = new URL('.', import.meta.url).pathname;

function copyTypes() {
  return {
    name: 'copy-types',
    closeBundle() {
      fs.copyFileSync(resolve(__dir, 'src/index.d.ts'), resolve(__dir, 'dist/index.d.ts'));
      fs.copyFileSync(resolve(__dir, 'src/globals.d.ts'), resolve(__dir, 'dist/globals.d.ts'));
    },
  };
}

export default defineConfig({
  plugins: [react(), copyTypes()],

  build: {
    lib: {
      entry: resolve(__dir, 'src/index.ts'),
      name: 'FluidityJS',
      fileName: 'index',
      formats: ['es'],
    },
    minify: 'esbuild',
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: false,
  },

  esbuild: {
    legalComments: 'none',
  },

  worker: {
    format: 'es',
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
  },
});
