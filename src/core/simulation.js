'use strict';

import { mergeConfig } from './config.js';
import { initWebGL, createPrograms, createFBO, createDoubleFBO, createBlit } from './gl-utils.js';
import { createTextTextures, createImageTextures, loadImageBitmap } from './textures.js';

// rAF shim — works on main thread and in workers (Chrome 69+)
const raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame.bind(globalThis)
    : (fn) => setTimeout(fn, 1000 / 60);

const craf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame.bind(globalThis)
    : clearTimeout;

const DT = 0.016;

/**
 * Self-contained WebGL fluid simulation.
 * Accepts either an HTMLCanvasElement (main thread) or OffscreenCanvas (worker).
 */
export class FluidSimulation {
  #canvas;
  #gl;
  #ext;
  #programs;
  #blit;

  #width = 0;
  #height = 0;
  #simWidth = 0;
  #simHeight = 0;

  #density = null;
  #velocity = null;
  #divergence = null;
  #pressure = null;
  #curl = null;

  #backgroundTex = null;
  #obstacleTex = null;

  #config;
  #mouse = { x: 0, y: 0, dx: 0, dy: 0, targetX: 0, targetY: 0, moved: false };

  // Stores source so textures can be rebuilt on resize
  #source = null; // { type: 'text', opts } | { type: 'image', bitmap, effect }

  #rafId = null;
  #isReady = false;
  #isImageMode = false;

  /**
   * @param {HTMLCanvasElement | OffscreenCanvas} canvas
   * @param {Partial<import('../../types/index.d.ts').FluidConfig>} [config]
   */
  constructor(canvas, config = {}) {
    this.#canvas = canvas;
    this.#config = mergeConfig(config);

    const { gl, ext } = initWebGL(canvas);
    this.#gl = gl;
    this.#ext = ext;
    this.#programs = createPrograms(gl);
    this.#blit = createBlit(gl);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Sets the simulation source to rendered text and (re)starts the loop.
   * @param {{ text: string, fontSize: number, color: string, fontFamily?: string, fontWeight?: string | number }} opts
   */
  setTextSource(opts) {
    this.#isImageMode = false;
    this.#source = { type: 'text', opts };
    this.#applyDimensions();
    this.#applySource();
    this.#ensureRunning();
  }

  /**
   * Loads an image from a URL, sets it as source, and (re)starts the loop.
   * @param {string} src
   * @param {number} [effect=0.4]
   * @returns {Promise<void>}
   */
  async setImageSource(src, effect = 0.4, size = 'cover') {
    const bitmap = await loadImageBitmap(src);
    this.#isImageMode = true;
    this.#source = { type: 'image', bitmap, effect, size };
    this.#applyDimensions();
    this.#applySource();
    this.#ensureRunning();
  }

  /**
   * Sets a pre-loaded ImageBitmap as source (used from worker when bitmap is received via postMessage).
   * @param {ImageBitmap} bitmap
   * @param {number} [effect=0.4]
   * @param {string | number} [size='cover']
   */
  setImageBitmap(bitmap, effect = 0.4, size = 'cover') {
    this.#isImageMode = true;
    this.#source = { type: 'image', bitmap, effect, size };
    this.#applyDimensions();
    this.#applySource();
    this.#ensureRunning();
  }

  /**
   * Reports mouse/touch movement into the simulation.
   * x and y are canvas-relative pixel coordinates.
   * @param {number} x
   * @param {number} y
   * @param {number} [strength=1]
   */
  handleMove(x, y, strength = 1) {
    this.#mouse.moved = true;
    this.#mouse.dx = (x - this.#mouse.targetX) * strength;
    this.#mouse.dy = (y - this.#mouse.targetY) * strength;
    this.#mouse.targetX = x;
    this.#mouse.targetY = y;
  }

  /**
   * Must be called when the canvas dimensions change.
   * When width/height are passed (e.g. from ResizeObserver) they are applied
   * directly without reading clientWidth, which can be stale or zero for
   * programmatically-created canvases.
   * @param {number} [width]
   * @param {number} [height]
   */
  resize(width, height) {
    if (width !== undefined && width > 0) {
      this.#width = this.#canvas.width = width;
      this.#height = this.#canvas.height = height;
      this.#simWidth = width >> 1;
      this.#simHeight = height >> 1;
      this.#initFBOs();
    } else {
      this.#applyDimensions();
    }
    if (this.#source) this.#applySource();
  }

  /** Merges a partial config update (takes effect next frame). */
  updateConfig(partial) {
    Object.assign(this.#config, partial);
  }

  /** Destroys all FBOs, textures, programs and stops the loop. */
  destroy() {
    this.stop();
    const gl = this.#gl;

    this.#disposeFBOs();
    this.#disposeTextures();

    for (const prog of Object.values(this.#programs)) {
      prog.dispose();
    }

    // Signal the driver to release the context
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    loseCtx?.loseContext();
  }

  // -------------------------------------------------------------------------
  // Loop control
  // -------------------------------------------------------------------------

  start() {
    if (this.#rafId !== null) return;
    const loop = () => {
      this.#step();
      this.#rafId = raf(loop);
    };
    this.#rafId = raf(loop);
  }

  stop() {
    if (this.#rafId !== null) {
      craf(this.#rafId);
      this.#rafId = null;
    }
  }

  get isRunning() {
    return this.#rafId !== null;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  #applyDimensions() {
    const canvas = this.#canvas;
    // clientWidth/clientHeight are only available on HTMLCanvasElement
    this.#width = canvas.width = canvas.clientWidth || canvas.width;
    this.#height = canvas.height = canvas.clientHeight || canvas.height;

    if (this.#width === 0 || this.#height === 0) return;

    this.#simWidth = this.#width >> 1;
    this.#simHeight = this.#height >> 1;
    this.#initFBOs();
  }

  #initFBOs() {
    const { gl, ext } = { gl: this.#gl, ext: this.#ext };
    const w = this.#simWidth;
    const h = this.#simHeight;

    this.#disposeFBOs();

    this.#density = createDoubleFBO(gl, ext, w, h);
    this.#velocity = createDoubleFBO(gl, ext, w, h);
    this.#pressure = createDoubleFBO(gl, ext, w, h);
    this.#divergence = createFBO(gl, ext, w, h);
    this.#curl = createFBO(gl, ext, w, h);
  }

  #applySource() {
    if (!this.#source || this.#width === 0) return;

    this.#disposeTextures();

    if (this.#source.type === 'text') {
      const { backgroundTex, obstacleTex } = createTextTextures(
        this.#gl, this.#width, this.#height, this.#source.opts
      );
      this.#backgroundTex = backgroundTex;
      this.#obstacleTex = obstacleTex;
    } else {
      const { backgroundTex, obstacleTex } = createImageTextures(
        this.#gl, this.#source.bitmap, this.#width, this.#height, this.#source.effect, this.#source.size
      );
      this.#backgroundTex = backgroundTex;
      this.#obstacleTex = obstacleTex;
    }

    this.#isReady = true;
  }

  #ensureRunning() {
    if (this.#isReady && !this.isRunning) this.start();
  }

  #disposeFBOs() {
    this.#density?.dispose();
    this.#velocity?.dispose();
    this.#pressure?.dispose();
    if (this.#divergence) {
      this.#gl.deleteTexture(this.#divergence.tex);
      this.#gl.deleteFramebuffer(this.#divergence.fbo);
    }
    if (this.#curl) {
      this.#gl.deleteTexture(this.#curl.tex);
      this.#gl.deleteFramebuffer(this.#curl.fbo);
    }
    this.#density = this.#velocity = this.#pressure = this.#divergence = this.#curl = null;
  }

  #disposeTextures() {
    if (this.#backgroundTex) this.#gl.deleteTexture(this.#backgroundTex);
    if (this.#obstacleTex) this.#gl.deleteTexture(this.#obstacleTex);
    this.#backgroundTex = this.#obstacleTex = null;
  }

  #step() {
    if (!this.#isReady || this.#width === 0) return;

    const gl = this.#gl;
    const cfg = this.#config;
    const { advection, divergence, pressure, gradientSubtract, splat, curl, vorticity, display } = this.#programs;

    // Smooth mouse for the "heavy liquid" feel
    this.#mouse.x += (this.#mouse.targetX - this.#mouse.x) * 0.15;
    this.#mouse.y += (this.#mouse.targetY - this.#mouse.y) * 0.15;

    const W = this.#simWidth;
    const H = this.#simHeight;
    const blit = this.#blit;

    gl.viewport(0, 0, W, H);

    // 1. Advect velocity
    advection.bind();
    gl.uniform2f(advection.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1f(advection.uniforms.dt, DT);
    gl.uniform1i(advection.uniforms.uObstacle, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    gl.uniform1f(advection.uniforms.dissipation, cfg.velocityDissipation);
    gl.uniform1i(advection.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.#velocity.read.tex);
    gl.uniform1i(advection.uniforms.uSource, 1);
    blit(this.#velocity.write.fbo); this.#velocity.swap();

    // 2. Advect density
    gl.uniform1f(advection.uniforms.dissipation, cfg.densityDissipation);
    gl.uniform1i(advection.uniforms.uSource, 2);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.#density.read.tex);
    blit(this.#density.write.fbo); this.#density.swap();

    // 3. Vorticity (curl → confinement)
    curl.bind();
    gl.uniform2f(curl.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(curl.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#velocity.read.tex);
    blit(this.#curl.fbo);

    vorticity.bind();
    gl.uniform1f(vorticity.uniforms.curl, cfg.curl);
    gl.uniform1f(vorticity.uniforms.dt, DT);
    gl.uniform1i(vorticity.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#velocity.read.tex);
    gl.uniform1i(vorticity.uniforms.uCurl, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.#curl.tex);
    blit(this.#velocity.write.fbo); this.#velocity.swap();

    // 4. Splat on mouse move
    if (this.#mouse.moved) {
      splat.bind();
      gl.uniform1f(splat.uniforms.aspectRatio, this.#width / this.#height);
      gl.uniform2f(splat.uniforms.point, this.#mouse.x / this.#width, 1.0 - this.#mouse.y / this.#height);
      gl.uniform1f(splat.uniforms.radius, cfg.splatRadius);

      gl.uniform1i(splat.uniforms.uTarget, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#velocity.read.tex);
      gl.uniform3f(splat.uniforms.color, this.#mouse.dx * cfg.splatForce, -this.#mouse.dy * cfg.splatForce, 0);
      blit(this.#velocity.write.fbo); this.#velocity.swap();

      gl.uniform1i(splat.uniforms.uTarget, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#density.read.tex);
      gl.uniform1i(splat.uniforms.uBackground, 1);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.#backgroundTex);
      gl.uniform1f(splat.uniforms.uSampleBackground, this.#isImageMode ? 1.0 : 0.0);
      gl.uniform3f(splat.uniforms.color, 1, 1, 1);
      blit(this.#density.write.fbo); this.#density.swap();

      this.#mouse.moved = false;
    }

    // 5. Project (divergence → pressure solve → gradient subtract)
    divergence.bind();
    gl.uniform1i(divergence.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#velocity.read.tex);
    gl.uniform1i(divergence.uniforms.uObstacle, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    blit(this.#divergence.fbo);

    pressure.bind();
    gl.uniform1i(pressure.uniforms.uDivergence, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#divergence.tex);
    gl.uniform1i(pressure.uniforms.uObstacle, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    for (let i = 0; i < cfg.pressureIterations; i++) {
      gl.uniform1i(pressure.uniforms.uPressure, 2);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.#pressure.read.tex);
      blit(this.#pressure.write.fbo); this.#pressure.swap();
    }

    gradientSubtract.bind();
    gl.uniform1i(gradientSubtract.uniforms.uPressure, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#pressure.read.tex);
    gl.uniform1i(gradientSubtract.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.#velocity.read.tex);
    gl.uniform1i(gradientSubtract.uniforms.uObstacle, 2);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    blit(this.#velocity.write.fbo); this.#velocity.swap();

    // 6. Display
    gl.viewport(0, 0, this.#width, this.#height);
    display.bind();
    gl.uniform2f(display.uniforms.texelSize, 1 / this.#width, 1 / this.#height);
    gl.uniform3fv(display.uniforms.uWaterColor, cfg.waterColor);
    gl.uniform3fv(display.uniforms.uGlowColor, cfg.glowColor);
    gl.uniform1f(display.uniforms.uRefraction, cfg.refraction);
    gl.uniform1f(display.uniforms.uSpecularExp, cfg.specularExp);
    gl.uniform1f(display.uniforms.uShine, cfg.shine);
    gl.uniform1f(display.uniforms.uImageFluid, this.#isImageMode ? 1.0 : 0.0);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.#density.read.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.#backgroundTex);
    gl.uniform1i(display.uniforms.uTexture, 0);
    gl.uniform1i(display.uniforms.uObstacle, 1);
    gl.uniform1i(display.uniforms.uBackground, 2);
    blit(null);
  }
}
