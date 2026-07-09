import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTextTextures } from '../../src/core/textures.ts';
import { createWebGLMock } from '../setup.js';

// Records the fillStyle at each fillRect call and the ctx.filter in effect at each
// fillText call, so we can assert both the backdrop colour and the blur softening.
function recordingCanvas() {
  const fills = [];
  const textFilters = [];
  const ctx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    filter: 'none',
    fillRect: vi.fn(function () {
      fills.push(ctx.fillStyle);
    }),
    fillText: vi.fn(function () {
      textFilters.push(ctx.filter);
    }),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  };
  return { ctx, fills, textFilters };
}

describe('createTextTextures — backdrop fringe (bug #1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps a black backdrop and blurs the glyph draw instead of flattening colour', () => {
    const { ctx, fills, textFilters } = recordingCanvas();
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(w, h) {
          this.width = w;
          this.height = h;
        }
        getContext() {
          return ctx;
        }
      }
    );

    createTextTextures(createWebGLMock(), 100, 50, { text: 'Hi', fontSize: 40, color: '#ffffff' });

    // Backdrop for the background/colour pass is still black. The AA fringe is fixed
    // by blurring the glyph edge instead (asserted below), not by flattening colour.
    expect(fills[0]).toBe('black');
    // The glyph draw (first fillText — background/colour pass) uses a blur filter so
    // the edge fades smoothly into black rather than a hard, dark AA ring.
    expect(textFilters[0]).toMatch(/^blur\(/);
  });

  it('blurs the obstacle/coverage glyph draw too, matching the colour pass', () => {
    const { ctx, textFilters } = recordingCanvas();
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(w, h) {
          this.width = w;
          this.height = h;
        }
        getContext() {
          return ctx;
        }
      }
    );

    createTextTextures(createWebGLMock(), 100, 50, { text: 'Hi', fontSize: 40, color: '#ffffff' });

    // fillText is called twice: [0] background/colour, [1] obstacle/coverage.
    // Both passes must share the same blur so the fringe fix is consistent.
    expect(textFilters[1]).toBe(textFilters[0]);
    expect(textFilters[1]).toMatch(/^blur\(/);
  });

  it('clamps textBlur to [0, 2] on both passes', () => {
    const { ctx, textFilters } = recordingCanvas();
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(w, h) {
          this.width = w;
          this.height = h;
        }
        getContext() {
          return ctx;
        }
      }
    );

    createTextTextures(createWebGLMock(), 100, 50, { text: 'Hi', fontSize: 40, color: '#ffffff', textBlur: 8 });

    expect(textFilters[0]).toBe('blur(2px)');
    expect(textFilters[1]).toBe('blur(2px)');
  });

  it('lets a background image fill the glyphs instead of the solid colour (bug #2)', () => {
    const { ctx } = recordingCanvas();
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(w, h) {
          this.width = w;
          this.height = h;
        }
        getContext() {
          return ctx;
        }
      }
    );

    const bitmap = { width: 200, height: 100, close: vi.fn() };
    createTextTextures(createWebGLMock(), 100, 50, { text: 'Hi', fontSize: 40, color: '#ffffff' }, bitmap);

    // Background pass must paint the image…
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    // …and NOT overlay the text colour over the glyphs (that would hide it).
    // Only the separate white obstacle-mask pass draws text → exactly one fillText.
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
  });
});

describe('createTextTextures — coverage shares the obstacle mask (text mode)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps coverageTex === obstacleTex for solid-colour text', () => {
    const { ctx } = recordingCanvas();
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(w, h) {
          this.width = w;
          this.height = h;
        }
        getContext() {
          return ctx;
        }
      }
    );

    const { obstacleTex, coverageTex } = createTextTextures(createWebGLMock(), 100, 50, {
      text: 'Hi',
      fontSize: 40,
      color: '#ffffff',
    });

    expect(coverageTex).toBe(obstacleTex);
  });

  it('keeps coverageTex === obstacleTex when a backgroundSrc image is set', () => {
    const { ctx } = recordingCanvas();
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(w, h) {
          this.width = w;
          this.height = h;
        }
        getContext() {
          return ctx;
        }
      }
    );

    const bitmap = { width: 200, height: 100, close: vi.fn() };
    const { obstacleTex, coverageTex } = createTextTextures(
      createWebGLMock(),
      100,
      50,
      { text: 'Hi', fontSize: 40, color: '#ffffff' },
      bitmap
    );

    expect(coverageTex).toBe(obstacleTex);
  });
});

describe('createTextTextures — textAlign (feature 1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['left',   0],
    ['center', 50],
    ['right',  100],
  ])('textAlign=%s positions fillText at x=%i', (align, expectedX) => {
    const fillTexts = [];
    const ctx = {
      fillStyle: '', font: '', textAlign: '', textBaseline: '',
      fillRect: vi.fn(),
      fillText: vi.fn((_t, x) => fillTexts.push(x)),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.stubGlobal('OffscreenCanvas', class {
      constructor(w, h) { this.width = w; this.height = h; }
      getContext() { return ctx; }
    });

    // width=100 → left=0, center=50, right=100
    createTextTextures(createWebGLMock(), 100, 50, { text: 'X', fontSize: 40, color: '#fff', textAlign: align });
    expect(fillTexts[0]).toBe(expectedX);
  });
});

describe('createTextTextures — textQuality (feature 2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tq=1 draws directly into the target canvas (no extra OffscreenCanvas)', () => {
    let instances = 0;
    const ctx = {
      fillStyle: '', font: '', textAlign: '', textBaseline: '',
      fillRect: vi.fn(), fillText: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(),
    };
    vi.stubGlobal('OffscreenCanvas', class {
      constructor(w, h) { this.width = w; this.height = h; instances++; }
      getContext() { return ctx; }
    });

    createTextTextures(createWebGLMock(), 100, 50, { text: 'X', fontSize: 40, color: '#fff', textQuality: 1 });
    // Only the 1 target canvas; no oversampled intermediary
    expect(instances).toBe(1);
  });

  it('tq=2 creates an oversampled canvas and scales it down', () => {
    const canvases = [];
    const ctx = {
      fillStyle: '', font: '', textAlign: '', textBaseline: '',
      fillRect: vi.fn(), fillText: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(),
    };
    vi.stubGlobal('OffscreenCanvas', class {
      constructor(w, h) { this.width = w; this.height = h; canvases.push(this); }
      getContext() { return ctx; }
    });

    createTextTextures(createWebGLMock(), 100, 50, { text: 'X', fontSize: 40, color: '#fff', textQuality: 2 });
    // Oversampled canvas (200×100) is created in addition to the main canvas (100×50)
    const oversized = canvases.filter(c => c.width === 200 && c.height === 100);
    expect(oversized.length).toBeGreaterThan(0);
    // Main canvas receives a drawImage call to scale it down
    expect(ctx.drawImage).toHaveBeenCalled();
  });
});
