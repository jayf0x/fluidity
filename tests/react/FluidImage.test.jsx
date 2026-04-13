import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { createRef } from 'react';

// ---------------------------------------------------------------------------
// Mock FluidController
// ---------------------------------------------------------------------------

const mockController = {
  setTextSource: vi.fn(),
  setImageSource: vi.fn(),
  setBackground: vi.fn(),
  handleMove: vi.fn(),
  updateConfig: vi.fn(),
  resize: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('../../src/fluid-controller.ts', () => ({
  FluidController: vi.fn(() => mockController),
}));

import { FluidImage } from '../../src/react/FluidImage.tsx';

describe('FluidImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a container div', () => {
    const { container } = render(<FluidImage src="https://example.com/img.jpg" />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('creates a canvas inside the container div', () => {
    const { container } = render(<FluidImage src="https://example.com/img.jpg" />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('applies className to the container div', () => {
    const { container } = render(
      <FluidImage src="https://example.com/img.jpg" className="fluid-img" />
    );
    expect(container.querySelector('div')).toHaveClass('fluid-img');
  });

  it('calls setImageSource with initial src, effect and default size', async () => {
    await act(async () => {
      render(<FluidImage src="https://example.com/img.jpg" effect={0.6} />);
    });
    expect(mockController.setImageSource).toHaveBeenCalledWith('https://example.com/img.jpg', 0.6, 'cover');
  });

  it('uses default effect of 0.4 and default size cover', async () => {
    await act(async () => {
      render(<FluidImage src="https://example.com/img.jpg" />);
    });
    expect(mockController.setImageSource).toHaveBeenCalledWith('https://example.com/img.jpg', 0.4, 'cover');
  });

  it('calls setImageSource again when src changes', async () => {
    const { rerender } = render(<FluidImage src="https://example.com/a.jpg" />);
    await act(async () => { rerender(<FluidImage src="https://example.com/b.jpg" />); });
    expect(mockController.setImageSource).toHaveBeenLastCalledWith('https://example.com/b.jpg', 0.4, 'cover');
  });

  it('calls setImageSource again when effect changes', async () => {
    const { rerender } = render(<FluidImage src="https://example.com/a.jpg" effect={0.3} />);
    await act(async () => { rerender(<FluidImage src="https://example.com/a.jpg" effect={0.7} />); });
    expect(mockController.setImageSource).toHaveBeenLastCalledWith('https://example.com/a.jpg', 0.7, 'cover');
  });

  it('passes imageSize prop to setImageSource', async () => {
    await act(async () => {
      render(<FluidImage src="https://example.com/img.jpg" imageSize="contain" />);
    });
    expect(mockController.setImageSource).toHaveBeenCalledWith('https://example.com/img.jpg', 0.4, 'contain');
  });

  it('does not call setImageSource when src is undefined', async () => {
    await act(async () => { render(<FluidImage src={undefined} />); });
    expect(mockController.setImageSource).not.toHaveBeenCalled();
  });

  it('exposes reset via ref', async () => {
    const ref = createRef();
    await act(async () => {
      render(<FluidImage ref={ref} src="https://example.com/img.jpg" effect={0.5} />);
    });
    ref.current.reset();
    expect(mockController.setImageSource).toHaveBeenLastCalledWith('https://example.com/img.jpg', 0.5, 'cover');
  });

  it('exposes updateLocation via ref', async () => {
    const ref = createRef();
    await act(async () => {
      render(<FluidImage ref={ref} src="https://example.com/img.jpg" />);
    });
    ref.current.updateLocation({ x: 50, y: 75 });
    expect(mockController.handleMove).toHaveBeenCalledWith(50, 75, 1);
  });

  it('exposes updateConfig via ref', async () => {
    const ref = createRef();
    await act(async () => {
      render(<FluidImage ref={ref} src="https://example.com/img.jpg" />);
    });
    ref.current.updateConfig({ refraction: 0.5 });
    expect(mockController.updateConfig).toHaveBeenCalledWith({ refraction: 0.5 });
  });

  it('destroys the controller on unmount', async () => {
    const { unmount } = render(<FluidImage src="https://example.com/img.jpg" />);
    await act(async () => { unmount(); });
    expect(mockController.destroy).toHaveBeenCalledOnce();
  });

  it('removes the canvas from DOM on unmount', async () => {
    const { container, unmount } = render(<FluidImage src="https://example.com/img.jpg" />);
    expect(container.querySelector('canvas')).toBeTruthy();
    await act(async () => { unmount(); });
    expect(container.querySelector('canvas')).toBeNull();
  });
});
