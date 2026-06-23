import react from '@vitejs/plugin-react';
import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

import { compressShaderLiterals } from './compress-shader-literals/plugin.js';

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

/**
 * Minifies GLSL and WGSL shader strings embedded as /* glsl *\/ and /* wgsl *\/ tagged
 * template literals in TypeScript source files. Runs before esbuild so the result
 * feeds into downstream minification.
 *
 * Strips // line comments, collapses leading whitespace and blank lines.
 * Does NOT rename identifiers — uniform/varying names must stay intact.
 */
/**
 * Replaces Vite's base64-encoded inline worker with a raw JS string.
 *
 * Vite inlines `?worker&inline` as:
 *   const VAR = "base64..."; ... new Blob([atob(VAR)], ...)
 *
 * atob() is only needed because base64 can't be embedded as a Blob directly.
 * Swapping to a raw UTF-8 string removes the 33% base64 overhead and lets
 * gzip compress the worker code at its natural density.
 */
function workerRawString() {
  return {
    name: 'worker-raw-string',
    enforce: 'post',
    apply: 'build',
    generateBundle(_opts, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;

        // Match: const VARNAME="base64string" (anywhere in the chunk)
        const varRe = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*"([A-Za-z0-9+/]{200,}={0,2})"/g;
        let match;
        while ((match = varRe.exec(chunk.code)) !== null) {
          const [fullMatch, varName, b64] = match;

          // Verify this variable is used in atob(VAR) + Blob context
          const atobRe = new RegExp(`\\batob\\(${varName}\\)`, 'g');
          if (!atobRe.test(chunk.code)) continue;

          // Decode the base64 worker code
          let workerCode;
          try {
            workerCode = Buffer.from(b64, 'base64').toString('utf-8');
          } catch {
            continue;
          }

          // Replace the base64 assignment with the raw string
          const rawString = JSON.stringify(workerCode);
          chunk.code = chunk.code.replace(fullMatch, `${varName}=${rawString}`);

          // Replace atob(VAR) → VAR (no longer needs decoding)
          chunk.code = chunk.code.replace(new RegExp(`\\batob\\(${varName}\\)`, 'g'), varName);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [compressShaderLiterals.vite({ outputRatio: true }), react(), copyTypes(), workerRawString()],

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
    drop: ['debugger'],
    pure: ['console.debug'],
  },

  worker: {
    format: 'es',
    plugins: [compressShaderLiterals.vite()],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
  },
});
