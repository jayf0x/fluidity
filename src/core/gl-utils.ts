import {
  baseVertexShader,
  advectionShader,
  divergenceShader,
  pressureShader,
  gradientSubtractShader,
  splatShader,
  curlShader,
  vorticityShader,
  displayShader,
} from './shaders';

type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface GLExt {
  internalFormat: number;
  format: number;
  type: number;
}

export interface FBO {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
}

export interface DoubleFBO {
  readonly read: FBO;
  readonly write: FBO;
  swap(): void;
  dispose(): void;
}

export interface Programs {
  advection: Program;
  divergence: Program;
  pressure: Program;
  gradientSubtract: Program;
  splat: Program;
  curl: Program;
  vorticity: Program;
  display: Program;
}

/**
 * Initialises a WebGL2 (or WebGL1 fallback) context.
 */
export function initWebGL(canvas: HTMLCanvasElement | OffscreenCanvas): { gl: GL; ext: GLExt; isWebGL2: boolean } {
  const params = { alpha: true, depth: false, stencil: false, antialias: true, preserveDrawingBuffer: false };

  let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null;
  const isWebGL2 = !!gl;

  if (!isWebGL2) {
    gl = canvas.getContext('webgl', params) as WebGLRenderingContext;
    (gl as WebGLRenderingContext).getExtension('EXT_color_buffer_half_float');
  }

  const halfFloatExt = isWebGL2 ? null : (gl as WebGLRenderingContext).getExtension('OES_texture_half_float');
  const halfFloat: number = isWebGL2
    ? (gl as WebGL2RenderingContext).HALF_FLOAT
    : (halfFloatExt as { HALF_FLOAT_OES: number }).HALF_FLOAT_OES;

  gl!.getExtension('EXT_color_buffer_float');
  gl!.getExtension('OES_texture_half_float_linear');

  return {
    gl: gl!,
    isWebGL2,
    ext: {
      internalFormat: isWebGL2 ? (gl as WebGL2RenderingContext).RGBA16F : gl!.RGBA,
      format: gl!.RGBA,
      type: halfFloat,
    },
  };
}

/**
 * Compiles and links a WebGL program, caching uniform locations.
 */
export class Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation> = {};
  private _gl: GL;

  constructor(gl: GL, vertSrc: string, fragSrc: string) {
    this._gl = gl;
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, this._compile(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(this.program, this._compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(this.program);

    const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(this.program, i)!.name;
      this.uniforms[name] = gl.getUniformLocation(this.program, name)!;
    }
  }

  private _compile(type: number, source: string): WebGLShader {
    const gl = this._gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  bind(): void {
    this._gl.useProgram(this.program);
  }

  dispose(): void {
    this._gl.deleteProgram(this.program);
  }
}

/**
 * Creates all simulation programs from the shared vertex shader.
 */
export function createPrograms(gl: GL): Programs {
  return {
    advection: new Program(gl, baseVertexShader, advectionShader),
    divergence: new Program(gl, baseVertexShader, divergenceShader),
    pressure: new Program(gl, baseVertexShader, pressureShader),
    gradientSubtract: new Program(gl, baseVertexShader, gradientSubtractShader),
    splat: new Program(gl, baseVertexShader, splatShader),
    curl: new Program(gl, baseVertexShader, curlShader),
    vorticity: new Program(gl, baseVertexShader, vorticityShader),
    display: new Program(gl, baseVertexShader, displayShader),
  };
}

/**
 * Creates a single framebuffer object with a texture attachment.
 */
export function createFBO(gl: GL, ext: GLExt, w: number, h: number): FBO {
  gl.activeTexture(gl.TEXTURE0);
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, ext.internalFormat, w, h, 0, ext.format, ext.type, null);

  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  return { tex: texture, fbo, width: w, height: h };
}

/**
 * Creates a ping-pong framebuffer pair for read/write simulation passes.
 */
export function createDoubleFBO(gl: GL, ext: GLExt, w: number, h: number): DoubleFBO {
  let f1 = createFBO(gl, ext, w, h);
  let f2 = createFBO(gl, ext, w, h);
  return {
    get read() { return f1; },
    get write() { return f2; },
    swap() { [f1, f2] = [f2, f1]; },
    dispose() {
      gl.deleteTexture(f1.tex);
      gl.deleteFramebuffer(f1.fbo);
      gl.deleteTexture(f2.tex);
      gl.deleteFramebuffer(f2.fbo);
    },
  };
}

/**
 * Creates a blit function that renders a full-screen quad.
 * The vertex buffer and attribute pointer are set up once here — not per call.
 */
export function createBlit(gl: GL): (target: WebGLFramebuffer | null) => void {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
    gl.STATIC_DRAW
  );
  // Set once — the quad buffer never changes between draws
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  return function blit(target: WebGLFramebuffer | null) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  };
}
