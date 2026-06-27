import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTextTextures } from '../../src/core/textures.ts';
import { createWebGLMock } from '../setup.js';

// Records the fillStyle in effect at each fillRect call so we can assert what
// colour the backdrop is painted with.
function recordingCanvas() {
  const fills = [];
  const ctx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    filter: 'none',
    fillRect: vi.fn(function () {
      fills.push(ctx.fillStyle);
    }),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  };
  return { ctx, fills };
}

describe('createTextTextures — backdrop fringe (bug #1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fills the colour backdrop with the text colour, not black', () => {
    const { ctx, fills } = recordingCanvas();
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

    // The first full-canvas fill is the background/colour pass — must be the text
    // colour so anti-aliased glyph edges don't blend into a black fringe.
    expect(fills[0]).toBe('#ffffff');
    expect(fills[0]).not.toBe('black');
  });
});
