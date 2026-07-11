import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FluidSimulation } from '../../src/core/simulation.ts';
import { createCanvasMock, createWebGLMock } from '../setup.js';

// ---------------------------------------------------------------------------
// loadImageBitmap is mocked so we control resolution timing
// ---------------------------------------------------------------------------
vi.mock('../../src/core/textures.ts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadImageBitmap: vi.fn(),
  };
});

import { loadImageBitmap } from '../../src/core/textures.ts';

describe('FluidSimulation — image source loading', () => {
  let canvas;
  let sim;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = createCanvasMock();
    sim = new FluidSimulation(canvas, {});
  });

  it('stops gracefully if destroyed while image fetch is in flight', async () => {
    let resolve;
    const bitmap = { width: 100, height: 100, close: vi.fn() };
    loadImageBitmap.mockReturnValue(new Promise((r) => { resolve = r; }));

    const fetchPromise = sim.setImageSource('http://localhost/img.png');

    // Destroy before the fetch resolves
    sim.destroy();

    // Resolve the fetch now (simulating a fast local image returning after destroy)
    resolve(bitmap);
    await fetchPromise;

    // Bitmap should be closed (not leaked) and simulation should not be running
    expect(bitmap.close).toHaveBeenCalled();
    expect(sim.isRunning).toBe(false);
  });

  it('starts the loop after resize when image was loaded before dimensions were known', async () => {
    // Simulate canvas with 0 dimensions initially
    const zeroCanvas = createCanvasMock();
    zeroCanvas.clientWidth = 0;
    zeroCanvas.clientHeight = 0;
    zeroCanvas.width = 0;
    zeroCanvas.height = 0;

    const sim2 = new FluidSimulation(zeroCanvas, {});

    const bitmap = { width: 100, height: 100, close: vi.fn() };
    loadImageBitmap.mockResolvedValue(bitmap);

    // Image loads but canvas has no size — loop should not start
    await sim2.setImageSource('http://localhost/img.png');
    expect(sim2.isRunning).toBe(false);

    // Resize provides valid dimensions — loop should now start
    sim2.resize(800, 600);
    expect(sim2.isRunning).toBe(true);

    sim2.destroy();
  });

  it('does not crash in #step when FBOs are null (guarded)', () => {
    // Ensure the simulation step guard handles null FBOs safely
    // by calling resize without a prior source (FBOs created but isReady=false)
    sim.resize(800, 600);
    // isReady is false so step shouldn't run — just verify no crash
    expect(() => sim.resize(800, 600)).not.toThrow();
  });

  it('runs a real GL frame (with the density pre-blur pass) without throwing (improvement #10)', () => {
    vi.useFakeTimers();
    sim.setTextSource({ text: 'Hi', fontSize: 40, color: '#fff' });
    sim.resize(200, 100);
    expect(() => vi.advanceTimersByTime(20)).not.toThrow();
    vi.useRealTimers();
  });
});

describe('FluidSimulation — simMaxPixels (feature #5)', () => {
  it('caps simWidth × simHeight for extreme aspect ratios, preserving aspect ratio', () => {
    const gl = createWebGLMock();
    const canvas = createCanvasMock(gl);
    // sim=1 (no downscale) + maxPixels=10000 on a 2000×20 canvas: naive sim dims would be
    // 2000×20 = 40000 texels, well over the cap.
    const sim2 = new FluidSimulation(canvas, {}, { sim: 1, maxPixels: 10000 });
    gl.texImage2D.mockClear();

    sim2.resize(2000, 20, 1);

    // createFBO's texImage2D(TEXTURE_2D, 0, internalFormat, w, h, ...) — read w/h (args 3, 4).
    const dims = gl.texImage2D.mock.calls.map(([, , , w, h]) => [w, h]);
    expect(dims.length).toBeGreaterThan(0);
    for (const [w, h] of dims) {
      expect(w * h).toBeLessThanOrEqual(10000);
      // Aspect ratio (2000:20 = 100:1) preserved within rounding.
      expect(Math.round(w / h)).toBe(100);
    }
  });

  it('leaves sim dims unclamped when simMaxPixels is unset (default/current behaviour)', () => {
    const gl = createWebGLMock();
    const canvas = createCanvasMock(gl);
    const sim2 = new FluidSimulation(canvas, {}, { sim: 1 });
    gl.texImage2D.mockClear();

    sim2.resize(2000, 20, 1);

    const dims = gl.texImage2D.mock.calls.map(([, , , w, h]) => [w, h]);
    expect(dims.some(([w, h]) => w === 2000 && h === 20)).toBe(true);
  });
});

describe('FluidSimulation — URL handling', () => {
  it('accepts absolute URLs for setImageSource', async () => {
    const canvas = createCanvasMock();
    const sim = new FluidSimulation(canvas, {});
    const bitmap = { width: 100, height: 100, close: vi.fn() };
    loadImageBitmap.mockResolvedValue(bitmap);

    await expect(sim.setImageSource('http://localhost:5173/assets/photo.png')).resolves.not.toThrow();
    sim.destroy();
  });
});

describe('FluidSimulation.create()', () => {
  it('returns a FluidSimulation instance', async () => {
    const canvas = createCanvasMock();
    // navigator.gpu is absent in jsdom — create() falls back to WebGL synchronously
    const sim = await FluidSimulation.create(canvas, {});
    expect(sim).toBeInstanceOf(FluidSimulation);
    sim.destroy();
  });

  it('starts on the WebGL path when WebGPU is unavailable', async () => {
    const canvas = createCanvasMock();
    const sim = await FluidSimulation.create(canvas, {});
    // initWebGPU short-circuits (navigator.gpu absent) before touching the canvas context.
    // The GL fallback then requests webgl2.
    expect(canvas.getContext).toHaveBeenCalledWith('webgl2', expect.any(Object));
    expect(canvas.getContext).not.toHaveBeenCalledWith('webgpu');
    sim.destroy();
  });

  it('is not running before a source is set', async () => {
    const canvas = createCanvasMock();
    const sim = await FluidSimulation.create(canvas, {});
    expect(sim.isRunning).toBe(false);
    sim.destroy();
  });
});
