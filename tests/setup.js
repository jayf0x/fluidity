import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// WebGL context mock
// Provides enough surface area to let Program, FBO utils, and FluidSimulation
// instantiate without a real GPU. Calls are recorded via vi.fn().
// ---------------------------------------------------------------------------

export function createWebGLMock() {
  const TEX = () => ({ _type: 'texture' });
  const FBO = () => ({ _type: 'framebuffer' });
  const BUF = () => ({ _type: 'buffer' });
  const PROG = () => ({ _type: 'program' });
  const SHDR = () => ({ _type: 'shader' });

  return {
    // Constants
    RGBA16F: 0x881a,
    RGBA: 0x1908,
    RGB: 0x1907,
    HALF_FLOAT: 0x140b,
    UNSIGNED_BYTE: 0x1401,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2800,
    TEXTURE_MAG_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    FRAMEBUFFER: 0x8d40,
    COLOR_ATTACHMENT0: 0x8ce0,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88b4,
    FLOAT: 0x1406,
    TRIANGLE_FAN: 0x0006,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    ACTIVE_UNIFORMS: 0x8b86,
    UNPACK_FLIP_Y_WEBGL: 37440,
    TEXTURE0: 0x84c0,
    TEXTURE1: 0x84c1,
    TEXTURE2: 0x84c2,
    TEXTURE3: 0x84c3,
    TEXTURE4: 0x84c4,
    COLOR_BUFFER_BIT: 0x4000,

    // Program / shader
    createProgram: vi.fn(PROG),
    createShader: vi.fn(SHDR),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    getProgramParameter: vi.fn(() => 1),
    getActiveUniform: vi.fn(() => ({ name: 'uTest' })),
    getUniformLocation: vi.fn(() => ({})),

    // Buffer
    createBuffer: vi.fn(BUF),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    vertexAttribPointer: vi.fn(),
    enableVertexAttribArray: vi.fn(),

    // Texture
    createTexture: vi.fn(TEX),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    activeTexture: vi.fn(),
    deleteTexture: vi.fn(),
    pixelStorei: vi.fn(),

    // Framebuffer
    createFramebuffer: vi.fn(FBO),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    deleteFramebuffer: vi.fn(),

    // Draw
    viewport: vi.fn(),
    drawArrays: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),

    // Uniforms
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform3fv: vi.fn(),

    // Extensions
    getExtension: vi.fn((name) => {
      if (name === 'OES_texture_half_float') return { HALF_FLOAT_OES: 0x8d61 };
      if (name === 'WEBGL_lose_context') return { loseContext: vi.fn() };
      return null;
    }),
  };
}

// ---------------------------------------------------------------------------
// Canvas mock
// ---------------------------------------------------------------------------

export function createCanvasMock(gl = createWebGLMock()) {
  return {
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
    getContext: vi.fn((type) => {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return gl;
      return null;
    }),
    transferControlToOffscreen: vi.fn(() => createCanvasMock(gl)),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
    style: {},
  };
}

// ---------------------------------------------------------------------------
// OffscreenCanvas shim (jsdom doesn't provide it)
// ---------------------------------------------------------------------------

if (typeof OffscreenCanvas === 'undefined') {
  global.OffscreenCanvas = class OffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return {
        fillStyle: '',
        shadowBlur: 0,
        shadowColor: '',
        filter: 'none',
        fillRect: vi.fn(),
        fillText: vi.fn(),
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        font: '',
        textAlign: 'center',
        textBaseline: 'middle',
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Worker shim (jsdom doesn't support Web Workers)
// ---------------------------------------------------------------------------

global.Worker = class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
  }
  postMessage = vi.fn();
  terminate = vi.fn();
};

// ---------------------------------------------------------------------------
// ResizeObserver shim
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  constructor(cb) { this._cb = cb; }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// ---------------------------------------------------------------------------
// createImageBitmap shim
// ---------------------------------------------------------------------------

if (typeof createImageBitmap === 'undefined') {
  global.createImageBitmap = vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() }));
}
