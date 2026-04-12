'use strict';

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
} from './shaders.js';

/**
 * Initialises a WebGL2 (or WebGL1 fallback) context.
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas
 * @returns {{ gl: WebGLRenderingContext | WebGL2RenderingContext, ext: { internalFormat: number, format: number, type: number }, isWebGL2: boolean }}
 */
export function initWebGL(canvas) {
  const params = { alpha: true, depth: false, stencil: false, antialias: true, preserveDrawingBuffer: false };

  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;

  if (!isWebGL2) {
    gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    gl.getExtension('EXT_color_buffer_half_float');
  }

  const halfFloatExt = isWebGL2 ? null : gl.getExtension('OES_texture_half_float');
  const halfFloat = isWebGL2 ? gl.HALF_FLOAT : halfFloatExt.HALF_FLOAT_OES;

  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_half_float_linear');

  return {
    gl,
    isWebGL2,
    ext: {
      internalFormat: isWebGL2 ? gl.RGBA16F : gl.RGBA,
      format: gl.RGBA,
      type: halfFloat,
    },
  };
}

/**
 * Compiles and links a WebGL program, caching uniform locations.
 */
export class Program {
  /** @type {WebGLProgram} */
  program;
  /** @type {Record<string, WebGLUniformLocation>} */
  uniforms = {};

  /**
   * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
   * @param {string} vertSrc
   * @param {string} fragSrc
   */
  constructor(gl, vertSrc, fragSrc) {
    this._gl = gl;
    this.program = gl.createProgram();
    gl.attachShader(this.program, this._compile(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(this.program, this._compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(this.program);

    const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(this.program, i).name;
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
  }

  /** @param {number} type @param {string} source */
  _compile(type, source) {
    const gl = this._gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  bind() {
    this._gl.useProgram(this.program);
  }

  dispose() {
    this._gl.deleteProgram(this.program);
  }
}

/**
 * Creates all simulation programs from the shared vertex shader.
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 */
export function createPrograms(gl) {
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
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @param {{ internalFormat: number, format: number, type: number }} ext
 * @param {number} w
 * @param {number} h
 */
export function createFBO(gl, ext, w, h) {
  gl.activeTexture(gl.TEXTURE0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, ext.internalFormat, w, h, 0, ext.format, ext.type, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  return { tex: texture, fbo, width: w, height: h };
}

/**
 * Creates a ping-pong framebuffer pair for read/write simulation passes.
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @param {{ internalFormat: number, format: number, type: number }} ext
 * @param {number} w
 * @param {number} h
 */
export function createDoubleFBO(gl, ext, w, h) {
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
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @returns {(target: WebGLFramebuffer | null) => void}
 */
export function createBlit(gl) {
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

  return function blit(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  };
}
