import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { createRef, StrictMode } from 'react';

// ---------------------------------------------------------------------------
// Mock FluidController so tests don't need a real WebGL context
// ---------------------------------------------------------------------------

const mockController = {
  setTextSource: vi.fn(),
  setImageSource: vi.fn(),
  handleMove: vi.fn(),
  updateConfig: vi.fn(),
  resize: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('../../src/fluid-controller.js', () => ({
  FluidController: vi.fn(() => mockController),
}));

import { FluidText } from '../../src/react/FluidText.jsx';

describe('FluidText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a container div', () => {
    const { container } = render(<FluidText text="Hello" />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('creates a canvas inside the container div', async () => {
    const { container } = render(<FluidText text="Hello" />);
    // Canvas is created programmatically in useEffect — present after render
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('applies className to the container div (not the canvas)', () => {
    const { container } = render(<FluidText text="Hi" className="my-fluid" />);
    expect(container.querySelector('div')).toHaveClass('my-fluid');
    expect(container.querySelector('canvas')).not.toHaveClass('my-fluid');
  });

  it('calls setTextSource with initial props', async () => {
    await act(async () => {
      render(<FluidText text="Hello" fontSize={80} color="#ff0000" />);
    });
    expect(mockController.setTextSource).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Hello', fontSize: 80, color: '#ff0000' })
    );
  });

  it('calls setTextSource again when text prop changes', async () => {
    const { rerender } = render(<FluidText text="Hello" />);
    await act(async () => { rerender(<FluidText text="World" />); });
    expect(mockController.setTextSource).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: 'World' })
    );
  });

  it('exposes reset via ref', async () => {
    const ref = createRef();
    await act(async () => {
      render(<FluidText ref={ref} text="Test" fontSize={60} color="#fff" />);
    });
    ref.current.reset();
    expect(mockController.setTextSource).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Test', fontSize: 60, color: '#fff' })
    );
  });

  it('exposes updateLocation via ref', async () => {
    const ref = createRef();
    await act(async () => {
      render(<FluidText ref={ref} text="X" />);
    });
    ref.current.updateLocation({ x: 100, y: 200, strength: 3 });
    expect(mockController.handleMove).toHaveBeenCalledWith(100, 200, 3);
  });

  it('exposes updateConfig via ref', async () => {
    const ref = createRef();
    await act(async () => {
      render(<FluidText ref={ref} text="X" />);
    });
    ref.current.updateConfig({ shine: 0.5 });
    expect(mockController.updateConfig).toHaveBeenCalledWith({ shine: 0.5 });
  });

  it('destroys the controller on unmount', async () => {
    const { unmount } = render(<FluidText text="Bye" />);
    await act(async () => { unmount(); });
    expect(mockController.destroy).toHaveBeenCalledOnce();
  });

  it('removes the canvas from DOM on unmount', async () => {
    const { container, unmount } = render(<FluidText text="Gone" />);
    expect(container.querySelector('canvas')).toBeTruthy();
    await act(async () => { unmount(); });
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('does not fire handleMove when useMouse=false', () => {
    const { container } = render(<FluidText text="X" useMouse={false} />);
    const div = container.querySelector('div');
    div.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10, bubbles: true }));
    expect(mockController.handleMove).not.toHaveBeenCalled();
  });

  it('mounts without error inside React.StrictMode (double-invoke)', async () => {
    await expect(
      act(async () => {
        render(
          <StrictMode>
            <FluidText text="StrictMode test" />
          </StrictMode>
        );
      })
    ).resolves.not.toThrow();
  });

  it('cleans up event listeners when useMouse toggles', async () => {
    const { container, rerender } = render(<FluidText text="X" useMouse={true} />);
    const div = container.querySelector('div');
    const removeSpy = vi.spyOn(div, 'removeEventListener');

    await act(async () => { rerender(<FluidText text="X" useMouse={false} />); });

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
  });
});
