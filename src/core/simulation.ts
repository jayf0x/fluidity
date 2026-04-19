import { mergeConfig } from './config';
import { createBlit, createDoubleFBO, createFBO, createPrograms, initWebGL } from './gl-utils';
import type { DoubleFBO, FBO, Programs } from './gl-utils';
import { createImageTextures, createTextTextures, loadImageBitmap } from './textures';

// rAF shim — works on main thread and in workers (Chrome 69+)
const raf: (fn: FrameRequestCallback) => number =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame.bind(globalThis)
    : (fn: FrameRequestCallback) => setTimeout(fn, 1000 / 60) as unknown as number;

const craf: (id: number) => void =
  typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame.bind(globalThis) : clearTimeout;

const DT = 0.016;

/** Maps FluidAlgorithm string → int uniform value for the display shader. */
const ALGORITHM_INT: Record<FluidAlgorithm, number> = { standard: 0, glass: 1, ink: 2, aurora: 3, ripple: 4 };

type Source =
  | { type: 'text'; opts: TextSourceOpts }
  | { type: 'image'; bitmap: ImageBitmap; effect: number; size: string | number };

interface MouseState {
  x: number;
  y: number;
  dx: number;
  dy: number;
  targetX: number;
  targetY: number;
  moved: boolean;
}

/**
 * Self-contained WebGL fluid simulation.
 * Accepts either an HTMLCanvasElement (main thread) or OffscreenCanvas (worker).
 */
export class FluidSimulation {
  #canvas: HTMLCanvasElement | OffscreenCanvas;
  #gl: WebGLRenderingContext | WebGL2RenderingContext;
  #ext: { internalFormat: number; format: number; type: number };
  #programs: Programs;
  #blit: (target: WebGLFramebuffer | null) => void;

  #width = 0;
  #height = 0;
  #simWidth = 0;
  #simHeight = 0;

  #density: DoubleFBO | null = null;
  #velocity: DoubleFBO | null = null;
  #divergence: FBO | null = null;
  #pressure: DoubleFBO | null = null;
  #curl: FBO | null = null;

  #backgroundTex: WebGLTexture | null = null;
  #obstacleTex: WebGLTexture | null = null;
  #coverageTex: WebGLTexture | null = null; // binary content mask for transparent canvas support

  #backgroundBitmap: ImageBitmap | null = null; // optional background image (from backgroundSrc prop)
  #backgroundSize: string | number = 'cover';

  #config: FluidConfig;
  #mouse: MouseState = { x: 0, y: 0, dx: 0, dy: 0, targetX: 0, targetY: 0, moved: false };

  // Stores source so textures can be rebuilt on resize
  #source: Source | null = null;

  #rafId: number | null = null;
  #isReady = false;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, config: Partial<FluidConfig> = {}) {
    this.#canvas = canvas;
    this.#config = mergeConfig(config);

    const { gl, ext } = initWebGL(canvas);
    this.#gl = gl;
    this.#ext = ext;
    this.#programs = createPrograms(gl);
    this.#blit = createBlit(gl);

    // Transparent clear colour — canvas composites with page CSS background
    gl.clearColor(0, 0, 0, 0);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setTextSource(opts: TextSourceOpts): void {
    this.#source = { type: 'text', opts };
    this.#applyDimensions();
    this.#applySource();
    this.#ensureRunning();
  }

  async setImageSource(src: string, effect = 0.0, size: string | number = 'cover'): Promise<void> {
    const bitmap = await loadImageBitmap(src);
    this.#source = { type: 'image', bitmap, effect, size };
    this.#applyDimensions();
    this.#applySource();
    this.#ensureRunning();
  }

  setImageBitmap(bitmap: ImageBitmap, effect = 0.0, size: string | number = 'cover'): void {
    this.#source = { type: 'image', bitmap, effect, size };
    this.#applyDimensions();
    this.#applySource();
    this.#ensureRunning();
  }

  setBackground(bitmap: ImageBitmap | null, size: string | number = 'cover'): void {
    if (this.#backgroundBitmap && this.#backgroundBitmap !== bitmap) {
      this.#backgroundBitmap.close();
    }
    this.#backgroundBitmap = bitmap;
    this.#backgroundSize = size ?? 'cover';
    if (this.#source && this.#width > 0) this.#applySource();
  }

  handleMove(x: number, y: number, strength = 1): void {
    this.#mouse.moved = true;
    this.#mouse.dx = (x - this.#mouse.targetX) * strength;
    this.#mouse.dy = (y - this.#mouse.targetY) * strength;
    this.#mouse.targetX = x;
    this.#mouse.targetY = y;
  }

  /**
   * Immediately applies one fluid splat at (x, y) with explicit velocity (vx, vy).
   * Safe to call multiple times per frame — each call writes directly to the FBOs.
   * Designed for programmatic use cases (e.g. particle systems, attractor paths)
   * where you want N independent injection points per frame without flooding the
   * mouse-state machine or the worker message queue.
   */
  splat(x: number, y: number, vx: number, vy: number, strength = 1): void {
    if (!this.#isReady || this.#width === 0) return;
    const gl = this.#gl;
    const cfg = this.#config;
    const { splat: prog } = this.#programs;
    const blit = this.#blit;

    gl.viewport(0, 0, this.#simWidth, this.#simHeight);

    prog.bind();
    gl.uniform1f(prog.uniforms.aspectRatio, this.#width / this.#height);
    gl.uniform2f(prog.uniforms.point, x / this.#width, 1.0 - y / this.#height);
    gl.uniform1f(prog.uniforms.radius, cfg.splatRadius);

    // Velocity splat
    gl.uniform1i(prog.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);
    gl.uniform3f(prog.uniforms.color, vx * cfg.splatForce * strength, -vy * cfg.splatForce * strength, 0);
    blit(this.#velocity!.write.fbo);
    this.#velocity!.swap();

    // Density splat
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#density!.read.tex);
    gl.uniform3f(prog.uniforms.color, strength, strength, strength);
    blit(this.#density!.write.fbo);
    this.#density!.swap();
  }

  resize(width?: number, height?: number): void {
    if (width !== undefined && width > 0) {
      this.#width = this.#canvas.width = width;
      this.#height = this.#canvas.height = height!;
      this.#simWidth = width >> 1;
      this.#simHeight = height! >> 1;
      this.#initFBOs();
    } else {
      this.#applyDimensions();
    }
    if (this.#source) this.#applySource();
  }

  updateConfig(partial: Partial<FluidConfig>): void {
    Object.assign(this.#config, partial);
  }

  destroy(): void {
    this.stop();
    const gl = this.#gl;

    this.#disposeFBOs();
    this.#disposeTextures();

    if (this.#backgroundBitmap) {
      this.#backgroundBitmap.close();
      this.#backgroundBitmap = null;
    }

    for (const prog of Object.values(this.#programs)) {
      prog.dispose();
    }

    const loseCtx = gl.getExtension('WEBGL_lose_context');
    loseCtx?.loseContext();
  }

  // ---------------------------------------------------------------------------
  // Loop control
  // ---------------------------------------------------------------------------

  start(): void {
    if (this.#rafId !== null) return;
    const loop = () => {
      this.#step();
      this.#rafId = raf(loop);
    };
    this.#rafId = raf(loop);
  }

  stop(): void {
    if (this.#rafId !== null) {
      craf(this.#rafId);
      this.#rafId = null;
    }
  }

  get isRunning(): boolean {
    return this.#rafId !== null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  #applyDimensions(): void {
    const canvas = this.#canvas as HTMLCanvasElement;
    this.#width = canvas.width = canvas.clientWidth || canvas.width;
    this.#height = canvas.height = canvas.clientHeight || canvas.height;

    if (this.#width === 0 || this.#height === 0) return;

    this.#simWidth = this.#width >> 1;
    this.#simHeight = this.#height >> 1;
    this.#initFBOs();
  }

  #initFBOs(): void {
    const gl = this.#gl;
    const ext = this.#ext;
    const w = this.#simWidth;
    const h = this.#simHeight;

    this.#disposeFBOs();

    this.#density = createDoubleFBO(gl, ext, w, h);
    this.#velocity = createDoubleFBO(gl, ext, w, h);
    this.#pressure = createDoubleFBO(gl, ext, w, h);
    this.#divergence = createFBO(gl, ext, w, h);
    this.#curl = createFBO(gl, ext, w, h);
  }

  #applySource(): void {
    if (!this.#source || this.#width === 0) return;

    this.#disposeTextures();

    if (this.#source.type === 'text') {
      const { backgroundTex, obstacleTex, coverageTex } = createTextTextures(
        this.#gl,
        this.#width,
        this.#height,
        this.#source.opts,
        this.#backgroundBitmap,
        this.#backgroundSize
      );
      this.#backgroundTex = backgroundTex;
      this.#obstacleTex = obstacleTex;
      this.#coverageTex = coverageTex; // same reference as obstacleTex
    } else {
      const { backgroundTex, obstacleTex, coverageTex } = createImageTextures(
        this.#gl,
        this.#source.bitmap,
        this.#width,
        this.#height,
        this.#source.effect,
        this.#source.size,
        this.#backgroundBitmap,
        this.#backgroundSize
      );
      this.#backgroundTex = backgroundTex;
      this.#obstacleTex = obstacleTex;
      this.#coverageTex = coverageTex;
    }

    this.#isReady = true;
  }

  #ensureRunning(): void {
    if (this.#isReady && !this.isRunning) this.start();
  }

  #disposeFBOs(): void {
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

  #disposeTextures(): void {
    if (this.#backgroundTex) this.#gl.deleteTexture(this.#backgroundTex);
    if (this.#obstacleTex) this.#gl.deleteTexture(this.#obstacleTex);
    // coverageTex may share the same WebGLTexture as obstacleTex (text mode) — guard double-delete
    if (this.#coverageTex && this.#coverageTex !== this.#obstacleTex) {
      this.#gl.deleteTexture(this.#coverageTex);
    }
    this.#backgroundTex = this.#obstacleTex = this.#coverageTex = null;
  }

  #step(): void {
    if (!this.#isReady || this.#width === 0) return;

    const gl = this.#gl;
    const cfg = this.#config;
    const { advection, divergence, pressure, gradientSubtract, splat, curl, vorticity, display } = this.#programs;

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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    gl.uniform1f(advection.uniforms.dissipation, cfg.velocityDissipation);
    gl.uniform1i(advection.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);
    gl.uniform1i(advection.uniforms.uSource, 1);
    blit(this.#velocity!.write.fbo);
    this.#velocity!.swap();

    // 2. Advect density
    gl.uniform1f(advection.uniforms.dissipation, cfg.densityDissipation);
    gl.uniform1i(advection.uniforms.uSource, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.#density!.read.tex);
    blit(this.#density!.write.fbo);
    this.#density!.swap();

    // 3. Vorticity (curl → confinement)
    curl.bind();
    gl.uniform2f(curl.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(curl.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);
    blit(this.#curl!.fbo);

    vorticity.bind();
    gl.uniform2f(vorticity.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1f(vorticity.uniforms.curl, cfg.curl);
    gl.uniform1f(vorticity.uniforms.dt, DT);
    gl.uniform1i(vorticity.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);
    gl.uniform1i(vorticity.uniforms.uCurl, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#curl!.tex);
    blit(this.#velocity!.write.fbo);
    this.#velocity!.swap();

    // 4. Splat on mouse move
    if (this.#mouse.moved) {
      splat.bind();
      gl.uniform1f(splat.uniforms.aspectRatio, this.#width / this.#height);
      gl.uniform2f(splat.uniforms.point, this.#mouse.x / this.#width, 1.0 - this.#mouse.y / this.#height);
      gl.uniform1f(splat.uniforms.radius, cfg.splatRadius);

      gl.uniform1i(splat.uniforms.uTarget, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);
      gl.uniform3f(splat.uniforms.color, this.#mouse.dx * cfg.splatForce, -this.#mouse.dy * cfg.splatForce, 0);
      blit(this.#velocity!.write.fbo);
      this.#velocity!.swap();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#density!.read.tex);
      gl.uniform3f(splat.uniforms.color, 1, 1, 1);
      blit(this.#density!.write.fbo);
      this.#density!.swap();

      this.#mouse.moved = false;
    }

    // 5. Project (divergence → pressure solve → gradient subtract)
    divergence.bind();
    gl.uniform2f(divergence.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(divergence.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);
    gl.uniform1i(divergence.uniforms.uObstacle, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    blit(this.#divergence!.fbo);

    pressure.bind();
    gl.uniform2f(pressure.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(pressure.uniforms.uDivergence, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#divergence!.tex);
    gl.uniform1i(pressure.uniforms.uObstacle, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    for (let i = 0; i < cfg.pressureIterations; i++) {
      gl.uniform1i(pressure.uniforms.uPressure, 2);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.#pressure!.read.tex);
      blit(this.#pressure!.write.fbo);
      this.#pressure!.swap();
    }

    gradientSubtract.bind();
    gl.uniform2f(gradientSubtract.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(gradientSubtract.uniforms.uPressure, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#pressure!.read.tex);
    gl.uniform1i(gradientSubtract.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);
    gl.uniform1i(gradientSubtract.uniforms.uObstacle, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    blit(this.#velocity!.write.fbo);
    this.#velocity!.swap();

    // 6. Display
    gl.viewport(0, 0, this.#width, this.#height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT); // clear to transparent (clearColor = 0,0,0,0)

    display.bind();
    gl.uniform2f(display.uniforms.texelSize, 1 / this.#width, 1 / this.#height);
    gl.uniform3fv(display.uniforms.uWaterColor, cfg.waterColor);
    gl.uniform3fv(display.uniforms.uGlowColor, cfg.glowColor);
    gl.uniform1f(display.uniforms.uRefraction, cfg.refraction);
    gl.uniform1f(display.uniforms.uSpecularExp, cfg.specularExp);
    gl.uniform1f(display.uniforms.uShine, cfg.shine);
    gl.uniform1f(display.uniforms.uWarpStrength, cfg.warpStrength ?? 0.015);
    gl.uniform1i(display.uniforms.uAlgorithm, ALGORITHM_INT[cfg.algorithm] ?? 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#density!.read.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#obstacleTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.#backgroundTex);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.#coverageTex);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.#velocity!.read.tex);

    gl.uniform1i(display.uniforms.uTexture, 0);
    gl.uniform1i(display.uniforms.uObstacle, 1);
    gl.uniform1i(display.uniforms.uBackground, 2);
    gl.uniform1i(display.uniforms.uCoverage, 3);
    gl.uniform1i(display.uniforms.uVelocity, 4);

    blit(null);
  }
}
