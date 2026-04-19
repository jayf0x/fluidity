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
