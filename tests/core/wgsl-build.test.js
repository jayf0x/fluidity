import fs from 'fs';
import path from 'path';

import { extractShaderLiterals, minifyShader } from 'compress-shader-literals';
import { WgslParser } from 'wgsl_reflect/wgsl_reflect.module.js';
import { describe, expect, it } from 'vitest';

import * as wgslShaders from '../../src/core/wgsl-shaders.ts';

// shaders.test.js only regex-checks the raw `src/` strings — it never sees
// what the build actually ships. compress-shader-literals (vite.config.js)
// runs at build time only, so a bug in *its* template-literal extraction once
// silently dropped the `${SHARED_VS_STRUCT}` interpolation from every shader
// that used it, shipping @vertex/@fragment functions referencing `VSOut`
// with no `struct VSOut` anywhere ("unresolved type 'VSOut'" in prod — never
// in `bun run dev`, which doesn't minify). Nothing here ran the string
// through a real WGSL parser, so it passed every existing test.
describe('wgsl-shaders.ts produces parseable WGSL', () => {
  it.each(Object.entries(wgslShaders))('%s (fully resolved, as consumed at runtime) parses', (_, src) => {
    expect(() => new WgslParser().parse(src)).not.toThrow();
  });
});

// Reproduces the actual build-time transform (same extractor + minifier the
// installed compress-shader-literals version runs in vite.config.js) against
// the real source file, so a regression in that dependency — like shipping
// the old version that dropped interpolations — fails here instead of in a
// consumer's browser.
describe('wgsl-shaders.ts survives the compress-shader-literals build transform', () => {
  const file = path.resolve(__dirname, '../../src/core/wgsl-shaders.ts');
  const literals = extractShaderLiterals(fs.readFileSync(file, 'utf8'), ['wgsl']);

  it('found shader literals to check (guards against the extractor regressing to 0)', () => {
    expect(literals.length).toBeGreaterThan(0);
  });

  it.each(literals.map((l, i) => [i, l]))('literal #%i minifies to valid WGSL', (_, literal) => {
    const minified = minifyShader(literal.value);
    expect(() => new WgslParser().parse(minified)).not.toThrow();
  });
});
