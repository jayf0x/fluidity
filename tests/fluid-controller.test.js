import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCanvasMock, createWebGLMock } from './setup.js';

// ---------------------------------------------------------------------------
// Provide a fake FluidWorker so no actual worker is spawned
// ---------------------------------------------------------------------------

const mockWorkerInstance = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onerror: null,
  onmessage: null,
};

vi.mock('../src/worker/index.ts?worker&inline', () => ({
  default: vi.fn(() => mockWorkerInstance),
}));

// Use the real FluidSimulation (with mocked WebGL) to validate the fallback path
vi.mock('../src/core/simulation.ts', () => ({
  FluidSimulation: vi.fn().mockImplementation(() => ({
    setTextSource: vi.fn(),
    setImageSource: vi.fn(),
    setImageBitmap: vi.fn(),
    setBackground: vi.fn(),
    handleMove: vi.fn(),
    splat: vi.fn(),
    resize: vi.fn(),
    updateConfig: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    isRunning: false,
  })),
}));

import { FluidController } from '../src/fluid-controller.ts';
import { FluidSimulation } from '../src/core/simulation.ts';

describe('FluidController — worker mode', () => {
  let canvas;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = createCanvasMock();
  });

  it('creates a worker and transfers the canvas', () => {
    new FluidController(canvas, { isWorkerEnabled: true });
    expect(canvas.transferControlToOffscreen).toHaveBeenCalledOnce();
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'init' }),
      expect.any(Array)
    );
  });

  it('forwards setTextSource to worker', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl.setTextSource({ text: 'Hi', fontSize: 40, color: '#fff' });
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'setTextSource' })
    );
  });

  it('forwards setImageSource to worker', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl.setImageSource('https://example.com/img.jpg', 0.5);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'setImageSource', src: 'https://example.com/img.jpg', effect: 0.5 })
    );
  });

  it('forwards handleMove to worker', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl.handleMove(100, 200, 3);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'move', x: 100, y: 200, strength: 3 })
    );
  });

  it('forwards updateConfig to worker', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl.updateConfig({ shine: 0.9 });
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updateConfig', config: { shine: 0.9 } })
    );
  });

  it('forwards resize to worker', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl.resize(1280, 720);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resize', width: 1280, height: 720 })
    );
  });

  it('forwards setBackground (with bitmap) to worker as transferable', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    const bitmap = { close: vi.fn() }; // minimal ImageBitmap mock
    ctrl.setBackground(bitmap, 'cover');
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'setBackground', bitmap, size: 'cover' }),
      [bitmap]
    );
  });

  it('forwards setBackground (null) to worker without transferable', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl.setBackground(null);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'setBackground', bitmap: null }),
      []
    );
  });

  it('forwards splat to worker', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl.splat(100, 200, 3, -5, 0.5);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'splat', x: 100, y: 200, vx: 3, vy: -5, strength: 0.5 })
    );
  });

  it('sends destroy message then terminates the worker after a tick', () => {
    vi.useFakeTimers();
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });

    ctrl.destroy();

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'destroy' });
    // terminate is deferred — should not have fired yet
    expect(mockWorkerInstance.terminate).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(mockWorkerInstance.terminate).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});

describe('FluidController — main-thread mode (isWorkerEnabled=false)', () => {
  let canvas;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = createCanvasMock();
  });

  it('does not transfer canvas control', () => {
    new FluidController(canvas, { isWorkerEnabled: false });
    expect(canvas.transferControlToOffscreen).not.toHaveBeenCalled();
    expect(FluidSimulation).toHaveBeenCalledOnce();
  });

  it('forwards all calls to FluidSimulation', () => {
    const ctrl = new FluidController(canvas, { isWorkerEnabled: false });
    const sim = FluidSimulation.mock.results[0].value;

    ctrl.setTextSource({ text: 'X', fontSize: 50, color: '#f00' });
    expect(sim.setTextSource).toHaveBeenCalledWith({ text: 'X', fontSize: 50, color: '#f00' });

    ctrl.handleMove(10, 20, 2);
    expect(sim.handleMove).toHaveBeenCalledWith(10, 20, 2);

    ctrl.splat(50, 60, 1.5, -2.0, 0.8);
    expect(sim.splat).toHaveBeenCalledWith(50, 60, 1.5, -2.0, 0.8);

    ctrl.updateConfig({ curl: 0.5 });
    expect(sim.updateConfig).toHaveBeenCalledWith({ curl: 0.5 });

    ctrl.resize(800, 600);
    expect(sim.resize).toHaveBeenCalledWith(800, 600);

    ctrl.destroy();
    expect(sim.destroy).toHaveBeenCalledOnce();
  });
});

describe('FluidController — StrictMode / double-transfer fallback', () => {
  it('falls back to main-thread when transferControlToOffscreen throws', () => {
    vi.clearAllMocks();
    const canvas = createCanvasMock();
    canvas.transferControlToOffscreen.mockImplementation(() => {
      throw new DOMException('Cannot transfer control from a canvas for more than one time.', 'InvalidStateError');
    });

    // Must not throw
    const ctrl = new FluidController(canvas, { isWorkerEnabled: true });

    // Should have created a FluidSimulation instead
    expect(FluidSimulation).toHaveBeenCalledOnce();

    // Worker should NOT have been started
    // (postMessage would only be called on init in worker path)
    const initCalls = mockWorkerInstance.postMessage.mock.calls.filter(
      ([msg]) => msg?.type === 'init'
    );
    expect(initCalls).toHaveLength(0);

    // Calls should route to the sim fallback
    const sim = FluidSimulation.mock.results[0].value;
    ctrl.handleMove(5, 5, 1);
    expect(sim.handleMove).toHaveBeenCalledWith(5, 5, 1);
  });

  it('survives a mount → destroy → remount cycle on the same canvas', () => {
    vi.clearAllMocks();

    // First mount — transfer succeeds
    const canvas = createCanvasMock();
    const ctrl1 = new FluidController(canvas, { isWorkerEnabled: true });
    ctrl1.destroy();

    // Second mount — transfer throws (canvas neutered)
    canvas.transferControlToOffscreen.mockImplementationOnce(() => {
      throw new DOMException('Already transferred', 'InvalidStateError');
    });
    const ctrl2 = new FluidController(canvas, { isWorkerEnabled: true });

    // Should have silently fallen back — not thrown
    expect(FluidSimulation).toHaveBeenCalledOnce();
    ctrl2.destroy();
  });
});
