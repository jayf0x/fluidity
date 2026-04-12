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

vi.mock('../src/worker/index.js?worker&inline', () => ({
  default: vi.fn(() => mockWorkerInstance),
}));

// Use the real FluidSimulation (with mocked WebGL) to validate the fallback path
vi.mock('../src/core/simulation.js', () => ({
  FluidSimulation: vi.fn().mockImplementation(() => ({
    setTextSource: vi.fn(),
    setImageSource: vi.fn(),
    setImageBitmap: vi.fn(),
    handleMove: vi.fn(),
    resize: vi.fn(),
    updateConfig: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    isRunning: false,
  })),
}));

import { FluidController } from '../src/fluid-controller.js';
import { FluidSimulation } from '../src/core/simulation.js';

describe('FluidController — worker mode', () => {
  let canvas;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = createCanvasMock();
  });

  it('creates a worker and transfers the canvas', () => {
    new FluidController(canvas, { worker: true });
    expect(canvas.transferControlToOffscreen).toHaveBeenCalledOnce();
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'init' }),
      expect.any(Array)
    );
  });

  it('forwards setTextSource to worker', () => {
    const ctrl = new FluidController(canvas, { worker: true });
    ctrl.setTextSource({ text: 'Hi', fontSize: 40, color: '#fff' });
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'setTextSource' })
    );
  });

  it('forwards setImageSource to worker', () => {
    const ctrl = new FluidController(canvas, { worker: true });
    ctrl.setImageSource('https://example.com/img.jpg', 0.5);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'setImageSource', src: 'https://example.com/img.jpg', effect: 0.5 })
    );
  });

  it('forwards handleMove to worker', () => {
    const ctrl = new FluidController(canvas, { worker: true });
    ctrl.handleMove(100, 200, 3);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'move', x: 100, y: 200, strength: 3 })
    );
  });

  it('forwards updateConfig to worker', () => {
    const ctrl = new FluidController(canvas, { worker: true });
    ctrl.updateConfig({ shine: 0.9 });
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updateConfig', config: { shine: 0.9 } })
    );
  });

  it('forwards resize to worker', () => {
    const ctrl = new FluidController(canvas, { worker: true });
    ctrl.resize(1280, 720);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resize', width: 1280, height: 720 })
    );
  });

  it('sends destroy message then terminates the worker after a tick', () => {
    vi.useFakeTimers();
    const ctrl = new FluidController(canvas, { worker: true });

    ctrl.destroy();

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'destroy' });
    // terminate is deferred — should not have fired yet
    expect(mockWorkerInstance.terminate).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(mockWorkerInstance.terminate).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});

describe('FluidController — main-thread mode (worker=false)', () => {
  let canvas;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = createCanvasMock();
  });

  it('does not transfer canvas control', () => {
    new FluidController(canvas, { worker: false });
    expect(canvas.transferControlToOffscreen).not.toHaveBeenCalled();
    expect(FluidSimulation).toHaveBeenCalledOnce();
  });

  it('forwards all calls to FluidSimulation', () => {
    const ctrl = new FluidController(canvas, { worker: false });
    const sim = FluidSimulation.mock.results[0].value;

    ctrl.setTextSource({ text: 'X', fontSize: 50, color: '#f00' });
    expect(sim.setTextSource).toHaveBeenCalledWith({ text: 'X', fontSize: 50, color: '#f00' });

    ctrl.handleMove(10, 20, 2);
    expect(sim.handleMove).toHaveBeenCalledWith(10, 20, 2);

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
    const ctrl = new FluidController(canvas, { worker: true });

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
    const ctrl1 = new FluidController(canvas, { worker: true });
    ctrl1.destroy();

    // Second mount — transfer throws (canvas neutered)
    canvas.transferControlToOffscreen.mockImplementationOnce(() => {
      throw new DOMException('Already transferred', 'InvalidStateError');
    });
    const ctrl2 = new FluidController(canvas, { worker: true });

    // Should have silently fallen back — not thrown
    expect(FluidSimulation).toHaveBeenCalledOnce();
    ctrl2.destroy();
  });
});
