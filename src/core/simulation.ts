import { mergeConfig, parseColor } from './config';
import {
  createBlit,
  createDoubleFBO,
  createFBO,
  createPrograms,
  initGLContext,
  initWebGPU,
  type DoubleFBO,
  type FBO,
  type Programs,
  type WebGPUContext,
} from './gl-utils';
import {
  createGPUDoubleFBO,
  createGPULinearSampler,
  createGPUPrograms,
  createGPUQuadBuffer,
  createGPUTextureFBO,
  createUniformBuffer,
  gpuRenderDisplay,
  gpuRenderToTexture,
  writeAdvUniforms,
  writeDisplayUniforms,
  writeSplatUniforms,
  writeTexelUniforms,
  writeVortUniforms,
  type GPUDoubleFBO,
  type GPUPrograms,
  type GPUTextureFBO,
} from './gpu-utils';
import {
  createImageTextures,
  createImageTexturesGPU,
  createTextTextures,
  createTextTexturesGPU,
  loadImageBitmap,
  type GPUTextureSet,
  type TextureSet,
} from './textures';

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
 * Self-contained fluid simulation.
 * Uses WebGPU when available (via the static `create()` factory) with
 * automatic fallback to WebGL2 → WebGL1.
 *
 * Calling `new FluidSimulation(canvas, config, quality)` directly always uses WebGL.
 * Use `FluidSimulation.create(canvas, config, quality)` for WebGPU-first behaviour.
 */
export class FluidSimulation {
  #canvas: HTMLCanvasElement | OffscreenCanvas;

  // ── WebGL path ──────────────────────────────────────────────────────────────
  #gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  #glExt: { internalFormat: number; format: number; type: number } | null = null;
  #glPrograms: Programs | null = null;
  #glBlit: ((target: WebGLFramebuffer | null) => void) | null = null;
  #glDensity: DoubleFBO | null = null;
  #glVelocity: DoubleFBO | null = null;
  #glDivergence: FBO | null = null;
  #glPressure: DoubleFBO | null = null;
  #glCurl: FBO | null = null;
  #glBgTex: WebGLTexture | null = null;
  #glObsTex: WebGLTexture | null = null;
  #glCovTex: WebGLTexture | null = null;

  // ── WebGPU path ─────────────────────────────────────────────────────────────
  #gpuCtx: WebGPUContext | null = null;
  #gpuPrograms: GPUPrograms | null = null;
  #gpuQuadBuf: GPUBuffer | null = null;
  #gpuSampler: GPUSampler | null = null;
  #gpuDensity: GPUDoubleFBO | null = null;
  #gpuVelocity: GPUDoubleFBO | null = null;
  #gpuDivergence: GPUTextureFBO | null = null;
  #gpuPressure: GPUDoubleFBO | null = null;
  #gpuCurl: GPUTextureFBO | null = null;
  #gpuTexSet: GPUTextureSet | null = null;
  // Pre-allocated uniform buffers (sizes: see gpu-utils writeXxx docs)
  // Velocity/density advection use separate buffers — writeBuffer is a queue op;
  // a second write to the same buffer before queue.submit() aliases both passes.
  #gpuUniAdv:     GPUBuffer | null = null; // 16 bytes — velocity advection
  #gpuUniAdvDen:  GPUBuffer | null = null; // 16 bytes — density advection
  #gpuUniDiv:     GPUBuffer | null = null; // 16 bytes
  #gpuUniPres:    GPUBuffer | null = null; // 16 bytes
  #gpuUniGrad:    GPUBuffer | null = null; // 16 bytes
  #gpuUniSplat:   GPUBuffer | null = null; // 48 bytes — velocity splat
  #gpuUniSplatDen:GPUBuffer | null = null; // 48 bytes — density splat
  #gpuUniCurl:    GPUBuffer | null = null; // 16 bytes
  #gpuUniVort:    GPUBuffer | null = null; // 16 bytes
  #gpuUniDisp:    GPUBuffer | null = null; // 64 bytes

  // ── Shared state ────────────────────────────────────────────────────────────
  #width = 0;
  #height = 0;
  #simWidth = 0;
  #simHeight = 0;
  #dpr = 1;
  #qualityDpr = 1;
  #simScale = 0.5;

  #backgroundBitmap: ImageBitmap | null = null;
  #backgroundSize: string | number = 'cover';

  #config: FluidConfig;
  #mouse: MouseState = { x: 0, y: 0, dx: 0, dy: 0, targetX: 0, targetY: 0, moved: false };

  #source: Source | null = null;

  #rafId: number | null = null;
  #isReady = false;
  #destroyed = false;
  #enableAlpha = true;

  // ── Constructor ─────────────────────────────────────────────────────────────

  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    config: Partial<FluidConfig> = {},
    quality: FluidQuality = {},
    gpuCtx?: WebGPUContext,
    enableAlpha = true
  ) {
    this.#canvas = canvas;
    this.#qualityDpr = Math.max(0.1, Math.min(1, quality.dpr ?? 1));
    this.#simScale = Math.max(0.1, Math.min(1, quality.sim ?? 0.5));
    this.#config = mergeConfig(config);
    this.#enableAlpha = enableAlpha;

    if (gpuCtx) {
      this.#gpuCtx = gpuCtx;
      this.#initGPUResources(gpuCtx);
    } else {
      const { gl, ext } = initGLContext(canvas, enableAlpha);
      this.#gl = gl;
      this.#glExt = ext;
      this.#glPrograms = createPrograms(gl);
      this.#glBlit = createBlit(gl);
      gl.clearColor(0, 0, 0, enableAlpha ? 0 : 1);
    }
  }

  /**
   * WebGPU-first factory. Tries WebGPU, falls back to WebGL2 → WebGL1.
   * This is the recommended entry point when WebGPU support is desired.
   */
  static async create(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    config: Partial<FluidConfig> = {},
    quality: FluidQuality = {},
    useWebGPU = true,
    enableAlpha = true
  ): Promise<FluidSimulation> {
    const gpuCtx = useWebGPU ? await initWebGPU(canvas, enableAlpha) : null;
    return new FluidSimulation(canvas, config, quality, gpuCtx ?? undefined, enableAlpha);
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
    if (this.#destroyed) { bitmap.close(); return; }
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
    if (this.#source && this.#width > 0 && this.#height > 0) this.#applySource();
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
    if (this.#gpuCtx) {
      this.#gpuSplat(x, y, vx, vy, strength);
    } else {
      this.#glSplat(x, y, vx, vy, strength);
    }
  }

  updateQuality(quality: FluidQuality): void {
    if (quality.dpr !== undefined) this.#qualityDpr = Math.max(0.1, Math.min(1, quality.dpr));
    if (quality.sim !== undefined) this.#simScale = Math.max(0.1, Math.min(1, quality.sim));
  }

  resize(width?: number, height?: number, dpr?: number): void {
    if (dpr !== undefined) this.#dpr = dpr;
    else if (typeof window !== 'undefined' && window.devicePixelRatio) this.#dpr = window.devicePixelRatio;
    if (width !== undefined && width > 0) {
      if (height === undefined || height <= 0) return;
      this.#width = this.#canvas.width = width;
      this.#height = this.#canvas.height = height;
      this.#simWidth = Math.max(1, Math.round(width * this.#simScale));
      this.#simHeight = Math.max(1, Math.round(height * this.#simScale));
      this.#initFBOs();
    } else {
      this.#applyDimensions();
    }
    if (this.#source) this.#applySource();
    this.#ensureRunning();
  }

  updateConfig(partial: Partial<FluidConfig>): void {
    Object.assign(this.#config, partial);
  }

  destroy(): void {
    this.#destroyed = true;
    this.stop();

    this.#disposeFBOs();
    this.#disposeTextures();

    if (this.#backgroundBitmap) {
      this.#backgroundBitmap.close();
      this.#backgroundBitmap = null;
    }

    if (this.#gpuCtx) {
      // Dispose uniform buffers
      this.#gpuUniAdv?.destroy();
      this.#gpuUniAdvDen?.destroy();
      this.#gpuUniDiv?.destroy();
      this.#gpuUniPres?.destroy();
      this.#gpuUniGrad?.destroy();
      this.#gpuUniSplat?.destroy();
      this.#gpuUniSplatDen?.destroy();
      this.#gpuUniCurl?.destroy();
      this.#gpuUniVort?.destroy();
      this.#gpuUniDisp?.destroy();
      this.#gpuQuadBuf?.destroy();
      this.#gpuCtx.device.destroy();
    } else {
      const gl = this.#gl!;
      for (const prog of Object.values(this.#glPrograms!)) prog.dispose();
      const loseCtx = gl.getExtension('WEBGL_lose_context');
      loseCtx?.loseContext();
    }
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
  // Private — GPU initialisation
  // ---------------------------------------------------------------------------

  #initGPUResources(gpu: WebGPUContext): void {
    const { device, format } = gpu;
    this.#gpuPrograms = createGPUPrograms(device, format, this.#enableAlpha);
    this.#gpuQuadBuf  = createGPUQuadBuffer(device);
    this.#gpuSampler  = createGPULinearSampler(device);
    this.#gpuUniAdv      = createUniformBuffer(device, 16);
    this.#gpuUniAdvDen   = createUniformBuffer(device, 16);
    this.#gpuUniDiv      = createUniformBuffer(device, 16);
    this.#gpuUniPres     = createUniformBuffer(device, 16);
    this.#gpuUniGrad     = createUniformBuffer(device, 16);
    this.#gpuUniSplat    = createUniformBuffer(device, 48);
    this.#gpuUniSplatDen = createUniformBuffer(device, 48);
    this.#gpuUniCurl     = createUniformBuffer(device, 16);
    this.#gpuUniVort     = createUniformBuffer(device, 16);
    this.#gpuUniDisp     = createUniformBuffer(device, 64);
  }

  // ---------------------------------------------------------------------------
  // Private — shared helpers
  // ---------------------------------------------------------------------------

  #applyDimensions(): void {
    const canvas = this.#canvas;
    if ('clientWidth' in canvas && (canvas as HTMLCanvasElement).clientWidth > 0) {
      this.#dpr = ((typeof window !== 'undefined' && window.devicePixelRatio) || 1) * this.#qualityDpr;
      this.#width  = (canvas as HTMLCanvasElement).width  = Math.round((canvas as HTMLCanvasElement).clientWidth  * this.#dpr);
      this.#height = (canvas as HTMLCanvasElement).height = Math.round((canvas as HTMLCanvasElement).clientHeight * this.#dpr);
    } else {
      this.#width  = canvas.width;
      this.#height = canvas.height;
    }

    if (this.#width === 0 || this.#height === 0) return;

    this.#simWidth  = Math.max(1, Math.round(this.#width  * this.#simScale));
    this.#simHeight = Math.max(1, Math.round(this.#height * this.#simScale));
    this.#initFBOs();
  }

  #initFBOs(): void {
    this.#disposeFBOs();

    if (this.#gpuCtx) {
      const { device } = this.#gpuCtx;
      const fmt = 'rgba16float' as GPUTextureFormat;
      const W = this.#simWidth, H = this.#simHeight;
      this.#gpuDensity    = createGPUDoubleFBO(device, fmt, W, H);
      this.#gpuVelocity   = createGPUDoubleFBO(device, fmt, W, H);
      this.#gpuPressure   = createGPUDoubleFBO(device, fmt, W, H);
      this.#gpuDivergence = createGPUTextureFBO(device, fmt, W, H);
      this.#gpuCurl       = createGPUTextureFBO(device, fmt, W, H);
    } else {
      const gl  = this.#gl!;
      const ext = this.#glExt!;
      const W = this.#simWidth, H = this.#simHeight;
      this.#glDensity    = createDoubleFBO(gl, ext, W, H);
      this.#glVelocity   = createDoubleFBO(gl, ext, W, H);
      this.#glPressure   = createDoubleFBO(gl, ext, W, H);
      this.#glDivergence = createFBO(gl, ext, W, H);
      this.#glCurl       = createFBO(gl, ext, W, H);
    }
  }

  #applySource(): void {
    if (!this.#source || this.#width === 0 || this.#height === 0) return;

    this.#disposeTextures();

    if (this.#gpuCtx) {
      const { device } = this.#gpuCtx;
      if (this.#source.type === 'text') {
        this.#gpuTexSet = createTextTexturesGPU(
          device, this.#width, this.#height, this.#source.opts,
          this.#backgroundBitmap, this.#backgroundSize
        );
      } else {
        this.#gpuTexSet = createImageTexturesGPU(
          device, this.#source.bitmap, this.#width, this.#height,
          this.#source.effect, this.#source.size,
          this.#backgroundBitmap, this.#backgroundSize
        );
      }
    } else {
      const gl = this.#gl!;
      if (this.#source.type === 'text') {
        const { backgroundTex, obstacleTex, coverageTex } = createTextTextures(
          gl, this.#width, this.#height, this.#source.opts,
          this.#backgroundBitmap, this.#backgroundSize
        );
        this.#glBgTex  = backgroundTex;
        this.#glObsTex = obstacleTex;
        this.#glCovTex = coverageTex; // same reference as obstacleTex
      } else {
        const { backgroundTex, obstacleTex, coverageTex } = createImageTextures(
          gl, this.#source.bitmap, this.#width, this.#height,
          this.#source.effect, this.#source.size,
          this.#backgroundBitmap, this.#backgroundSize
        );
        this.#glBgTex  = backgroundTex;
        this.#glObsTex = obstacleTex;
        this.#glCovTex = coverageTex;
      }
    }

    this.#isReady = true;
  }

  #ensureRunning(): void {
    if (this.#isReady && !this.isRunning) this.start();
  }

  #disposeFBOs(): void {
    if (this.#gpuCtx) {
      this.#gpuDensity?.dispose();
      this.#gpuVelocity?.dispose();
      this.#gpuPressure?.dispose();
      this.#gpuDivergence?.tex.destroy();
      this.#gpuCurl?.tex.destroy();
      this.#gpuDensity = this.#gpuVelocity = this.#gpuPressure = null;
      this.#gpuDivergence = this.#gpuCurl = null;
    } else {
      const gl = this.#gl!;
      this.#glDensity?.dispose();
      this.#glVelocity?.dispose();
      this.#glPressure?.dispose();
      if (this.#glDivergence) {
        gl.deleteTexture(this.#glDivergence.tex);
        gl.deleteFramebuffer(this.#glDivergence.fbo);
      }
      if (this.#glCurl) {
        gl.deleteTexture(this.#glCurl.tex);
        gl.deleteFramebuffer(this.#glCurl.fbo);
      }
      this.#glDensity = this.#glVelocity = this.#glPressure = this.#glDivergence = this.#glCurl = null;
    }
  }

  #disposeTextures(): void {
    if (this.#gpuCtx) {
      if (this.#gpuTexSet) {
        this.#gpuTexSet.backgroundTex.destroy();
        this.#gpuTexSet.obstacleTex.destroy();
        if (!this.#gpuTexSet.sharedCoverage) this.#gpuTexSet.coverageTex.destroy();
        this.#gpuTexSet = null;
      }
    } else {
      const gl = this.#gl!;
      if (this.#glBgTex)  gl.deleteTexture(this.#glBgTex);
      if (this.#glObsTex) gl.deleteTexture(this.#glObsTex);
      // coverageTex may share the same WebGLTexture as obstacleTex (text mode) — guard double-delete
      if (this.#glCovTex && this.#glCovTex !== this.#glObsTex) gl.deleteTexture(this.#glCovTex);
      this.#glBgTex = this.#glObsTex = this.#glCovTex = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — frame dispatch
  // ---------------------------------------------------------------------------

  #step(): void {
    if (!this.#isReady || this.#width === 0) return;
    if (this.#gpuCtx) {
      this.#gpuStep();
    } else {
      this.#glStep();
    }
  }

  // ---------------------------------------------------------------------------
  // Private — WebGPU simulation step
  // ---------------------------------------------------------------------------

  #gpuStep(): void {
    const gpu   = this.#gpuCtx!;
    const dev   = gpu.device;
    const progs = this.#gpuPrograms!;
    const quad  = this.#gpuQuadBuf!;
    const samp  = this.#gpuSampler!;
    const cfg   = this.#config;
    const tex   = this.#gpuTexSet!;

    if (!this.#gpuDensity || !this.#gpuVelocity) return;

    this.#mouse.x += (this.#mouse.targetX - this.#mouse.x) * 0.15;
    this.#mouse.y += (this.#mouse.targetY - this.#mouse.y) * 0.15;

    const W  = this.#simWidth,  H  = this.#simHeight;
    const FW = this.#width,     FH = this.#height;
    const tsx = 1 / W, tsy = 1 / H;

    // ── 1. Write all uniform buffers ────────────────────────────────────────
    writeAdvUniforms(dev, this.#gpuUniAdv!, tsx, tsy, DT, cfg.velocityDissipation);
    writeTexelUniforms(dev, this.#gpuUniDiv!,  tsx, tsy);
    writeTexelUniforms(dev, this.#gpuUniPres!, tsx, tsy);
    writeTexelUniforms(dev, this.#gpuUniGrad!, tsx, tsy);
    writeTexelUniforms(dev, this.#gpuUniCurl!, tsx, tsy);
    writeVortUniforms(dev,  this.#gpuUniVort!, tsx, tsy, cfg.curl, DT);
    writeDisplayUniforms(dev, this.#gpuUniDisp!,
      1 / FW, 1 / FH,
      cfg.refraction, cfg.specularExp,
      parseColor(cfg.waterColor),
      parseColor(cfg.glowColor),
      cfg.shine, cfg.warpStrength ?? 0.015,
      ALGORITHM_INT[cfg.algorithm] ?? 0,
      this.#enableAlpha
    );

    const enc = dev.createCommandEncoder();

    // Bind-group factory — creates a fresh bind group for a pipeline each time
    const bg = (pl: GPURenderPipeline, entries: GPUBindGroupEntry[]): GPUBindGroup =>
      dev.createBindGroup({ layout: pl.getBindGroupLayout(0), entries });

    const sampEntry: GPUBindGroupEntry = { binding: 1, resource: samp };

    // ── 2. Advect velocity ───────────────────────────────────────────────────
    {
      const group = bg(progs.advection, [
        { binding: 0, resource: { buffer: this.#gpuUniAdv! } },
        sampEntry,
        { binding: 2, resource: this.#gpuVelocity.read.view },
        { binding: 3, resource: this.#gpuVelocity.read.view },
        { binding: 4, resource: tex.obstacleView },
      ]);
      gpuRenderToTexture(enc, progs.advection, group, quad, this.#gpuVelocity.write.view);
    }
    this.#gpuVelocity.swap();

    // ── 3. Advect density ────────────────────────────────────────────────────
    {
      writeAdvUniforms(dev, this.#gpuUniAdvDen!, tsx, tsy, DT, cfg.densityDissipation);
      const group = bg(progs.advection, [
        { binding: 0, resource: { buffer: this.#gpuUniAdvDen! } },
        sampEntry,
        { binding: 2, resource: this.#gpuVelocity.read.view },
        { binding: 3, resource: this.#gpuDensity!.read.view },
        { binding: 4, resource: tex.obstacleView },
      ]);
      gpuRenderToTexture(enc, progs.advection, group, quad, this.#gpuDensity!.write.view);
    }
    this.#gpuDensity!.swap();

    // ── 4. Curl ──────────────────────────────────────────────────────────────
    {
      const group = bg(progs.curl, [
        { binding: 0, resource: { buffer: this.#gpuUniCurl! } },
        sampEntry,
        { binding: 2, resource: this.#gpuVelocity.read.view },
      ]);
      gpuRenderToTexture(enc, progs.curl, group, quad, this.#gpuCurl!.view);
    }

    // ── 5. Vorticity confinement ─────────────────────────────────────────────
    {
      const group = bg(progs.vorticity, [
        { binding: 0, resource: { buffer: this.#gpuUniVort! } },
        sampEntry,
        { binding: 2, resource: this.#gpuVelocity.read.view },
        { binding: 3, resource: this.#gpuCurl!.view },
      ]);
      gpuRenderToTexture(enc, progs.vorticity, group, quad, this.#gpuVelocity.write.view);
    }
    this.#gpuVelocity.swap();

    // ── 6. Splat on mouse move ───────────────────────────────────────────────
    if (this.#mouse.moved) {
      // UV.y=0 is at the top of the screen in the WGSL shaders — no Y flip needed.
      const px = (this.#mouse.x * this.#dpr) / FW;
      const py = (this.#mouse.y * this.#dpr) / FH;
      // Velocity splat — positive dy means downward (matches positive UV.y direction).
      writeSplatUniforms(dev, this.#gpuUniSplat!, tsx, tsy,
        FW / FH, cfg.splatRadius,
        this.#mouse.dx * cfg.splatForce, this.#mouse.dy * cfg.splatForce, 0,
        px, py
      );
      {
        const group = bg(progs.splat, [
          { binding: 0, resource: { buffer: this.#gpuUniSplat! } },
          sampEntry,
          { binding: 2, resource: this.#gpuVelocity.read.view },
        ]);
        gpuRenderToTexture(enc, progs.splat, group, quad, this.#gpuVelocity.write.view);
      }
      this.#gpuVelocity.swap();
      // Density splat
      writeSplatUniforms(dev, this.#gpuUniSplatDen!, tsx, tsy,
        FW / FH, cfg.splatRadius,
        1, 1, 1, px, py
      );
      {
        const group = bg(progs.splat, [
          { binding: 0, resource: { buffer: this.#gpuUniSplatDen! } },
          sampEntry,
          { binding: 2, resource: this.#gpuDensity!.read.view },
        ]);
        gpuRenderToTexture(enc, progs.splat, group, quad, this.#gpuDensity!.write.view);
      }
      this.#gpuDensity!.swap();
      this.#mouse.moved = false;
    }

    // ── 7. Divergence ────────────────────────────────────────────────────────
    {
      const group = bg(progs.divergence, [
        { binding: 0, resource: { buffer: this.#gpuUniDiv! } },
        sampEntry,
        { binding: 2, resource: this.#gpuVelocity.read.view },
        { binding: 3, resource: tex.obstacleView },
      ]);
      gpuRenderToTexture(enc, progs.divergence, group, quad, this.#gpuDivergence!.view);
    }

    // ── 8. Pressure solve (N iterations) ────────────────────────────────────
    for (let i = 0; i < cfg.pressureIterations; i++) {
      const group = bg(progs.pressure, [
        { binding: 0, resource: { buffer: this.#gpuUniPres! } },
        sampEntry,
        { binding: 2, resource: this.#gpuPressure!.read.view },
        { binding: 3, resource: this.#gpuDivergence!.view },
        { binding: 4, resource: tex.obstacleView },
      ]);
      gpuRenderToTexture(enc, progs.pressure, group, quad, this.#gpuPressure!.write.view);
      this.#gpuPressure!.swap();
    }

    // ── 9. Gradient subtract ─────────────────────────────────────────────────
    {
      const group = bg(progs.gradientSubtract, [
        { binding: 0, resource: { buffer: this.#gpuUniGrad! } },
        sampEntry,
        { binding: 2, resource: this.#gpuPressure!.read.view },
        { binding: 3, resource: this.#gpuVelocity.read.view },
        { binding: 4, resource: tex.obstacleView },
      ]);
      gpuRenderToTexture(enc, progs.gradientSubtract, group, quad, this.#gpuVelocity.write.view);
    }
    this.#gpuVelocity.swap();

    // ── 10. Display ──────────────────────────────────────────────────────────
    {
      const swapView = gpu.context.getCurrentTexture().createView();
      const group = bg(progs.display, [
        { binding: 0, resource: { buffer: this.#gpuUniDisp! } },
        sampEntry,
        { binding: 2, resource: this.#gpuDensity!.read.view },
        { binding: 3, resource: tex.obstacleView },
        { binding: 4, resource: tex.backgroundView },
        { binding: 5, resource: tex.coverageView },
        { binding: 6, resource: this.#gpuVelocity.read.view },
      ]);
      gpuRenderDisplay(enc, progs.display, group, quad, swapView);
    }

    dev.queue.submit([enc.finish()]);
  }

  // ---------------------------------------------------------------------------
  // Private — WebGPU direct splat
  // ---------------------------------------------------------------------------

  #gpuSplat(x: number, y: number, vx: number, vy: number, strength: number): void {
    const gpu  = this.#gpuCtx!;
    const dev  = gpu.device;
    const prog = this.#gpuPrograms!.splat;
    const quad = this.#gpuQuadBuf!;
    const samp = this.#gpuSampler!;
    const cfg  = this.#config;
    const W    = this.#simWidth, H = this.#simHeight;
    const tsx  = 1 / W, tsy = 1 / H;

    const enc = dev.createCommandEncoder();
    const sampEntry: GPUBindGroupEntry = { binding: 1, resource: samp };
    const bg = (entries: GPUBindGroupEntry[]) =>
      dev.createBindGroup({ layout: prog.getBindGroupLayout(0), entries });

    // UV.y=0 is at the top of the screen — no Y flip needed.
    const px = (x * this.#dpr) / this.#width;
    const py = (y * this.#dpr) / this.#height;

    writeSplatUniforms(dev, this.#gpuUniSplat!, tsx, tsy,
      this.#width / this.#height, cfg.splatRadius,
      vx * cfg.splatForce * strength, vy * cfg.splatForce * strength, 0,
      px, py
    );
    {
      const group = bg([
        { binding: 0, resource: { buffer: this.#gpuUniSplat! } },
        sampEntry,
        { binding: 2, resource: this.#gpuVelocity!.read.view },
      ]);
      gpuRenderToTexture(enc, prog, group, quad, this.#gpuVelocity!.write.view);
    }
    this.#gpuVelocity!.swap();

    writeSplatUniforms(dev, this.#gpuUniSplatDen!, tsx, tsy,
      this.#width / this.#height, cfg.splatRadius,
      strength, strength, strength, px, py
    );
    {
      const group = bg([
        { binding: 0, resource: { buffer: this.#gpuUniSplatDen! } },
        sampEntry,
        { binding: 2, resource: this.#gpuDensity!.read.view },
      ]);
      gpuRenderToTexture(enc, prog, group, quad, this.#gpuDensity!.write.view);
    }
    this.#gpuDensity!.swap();

    dev.queue.submit([enc.finish()]);
  }

  // ---------------------------------------------------------------------------
  // Private — WebGL splat
  // ---------------------------------------------------------------------------

  #glSplat(x: number, y: number, vx: number, vy: number, strength: number): void {
    const gl   = this.#gl!;
    const cfg  = this.#config;
    const prog = this.#glPrograms!.splat;
    const blit = this.#glBlit!;

    gl.viewport(0, 0, this.#simWidth, this.#simHeight);

    prog.bind();
    gl.uniform1f(prog.uniforms.aspectRatio, this.#width / this.#height);
    gl.uniform2f(prog.uniforms.point, (x * this.#dpr) / this.#width, 1.0 - (y * this.#dpr) / this.#height);
    gl.uniform1f(prog.uniforms.radius, cfg.splatRadius);

    gl.uniform1i(prog.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity!.read.tex);
    gl.uniform3f(prog.uniforms.color, vx * cfg.splatForce * strength, -vy * cfg.splatForce * strength, 0);
    blit(this.#glVelocity!.write.fbo);
    this.#glVelocity!.swap();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glDensity!.read.tex);
    gl.uniform3f(prog.uniforms.color, strength, strength, strength);
    blit(this.#glDensity!.write.fbo);
    this.#glDensity!.swap();
  }

  // ---------------------------------------------------------------------------
  // Private — WebGL simulation step (unchanged from original)
  // ---------------------------------------------------------------------------

  #glStep(): void {
    if (!this.#glDensity || !this.#glVelocity) return;

    const gl   = this.#gl!;
    const cfg  = this.#config;
    const { advection, divergence, pressure, gradientSubtract, splat, curl, vorticity, display } = this.#glPrograms!;

    this.#mouse.x += (this.#mouse.targetX - this.#mouse.x) * 0.15;
    this.#mouse.y += (this.#mouse.targetY - this.#mouse.y) * 0.15;

    const W    = this.#simWidth;
    const H    = this.#simHeight;
    const blit = this.#glBlit!;

    gl.viewport(0, 0, W, H);

    // 1. Advect velocity
    advection.bind();
    gl.uniform2f(advection.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1f(advection.uniforms.dt, DT);
    gl.uniform1i(advection.uniforms.uObstacle, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glObsTex);
    gl.uniform1f(advection.uniforms.dissipation, cfg.velocityDissipation);
    gl.uniform1i(advection.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity.read.tex);
    gl.uniform1i(advection.uniforms.uSource, 1);
    blit(this.#glVelocity.write.fbo);
    this.#glVelocity.swap();

    // 2. Advect density
    gl.uniform1f(advection.uniforms.dissipation, cfg.densityDissipation);
    gl.uniform1i(advection.uniforms.uSource, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.#glDensity.read.tex);
    blit(this.#glDensity.write.fbo);
    this.#glDensity.swap();

    // 3. Vorticity (curl → confinement)
    curl.bind();
    gl.uniform2f(curl.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(curl.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity.read.tex);
    blit(this.#glCurl!.fbo);

    vorticity.bind();
    gl.uniform2f(vorticity.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1f(vorticity.uniforms.curl, cfg.curl);
    gl.uniform1f(vorticity.uniforms.dt, DT);
    gl.uniform1i(vorticity.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity.read.tex);
    gl.uniform1i(vorticity.uniforms.uCurl, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#glCurl!.tex);
    blit(this.#glVelocity.write.fbo);
    this.#glVelocity.swap();

    // 4. Splat on mouse move
    if (this.#mouse.moved) {
      splat.bind();
      gl.uniform1f(splat.uniforms.aspectRatio, this.#width / this.#height);
      gl.uniform2f(splat.uniforms.point, (this.#mouse.x * this.#dpr) / this.#width, 1.0 - (this.#mouse.y * this.#dpr) / this.#height);
      gl.uniform1f(splat.uniforms.radius, cfg.splatRadius);

      gl.uniform1i(splat.uniforms.uTarget, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity.read.tex);
      gl.uniform3f(splat.uniforms.color, this.#mouse.dx * cfg.splatForce, -this.#mouse.dy * cfg.splatForce, 0);
      blit(this.#glVelocity.write.fbo);
      this.#glVelocity.swap();

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.#glDensity.read.tex);
      gl.uniform3f(splat.uniforms.color, 1, 1, 1);
      blit(this.#glDensity.write.fbo);
      this.#glDensity.swap();

      this.#mouse.moved = false;
    }

    // 5. Project (divergence → pressure solve → gradient subtract)
    divergence.bind();
    gl.uniform2f(divergence.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(divergence.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity.read.tex);
    gl.uniform1i(divergence.uniforms.uObstacle, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#glObsTex);
    blit(this.#glDivergence!.fbo);

    pressure.bind();
    gl.uniform2f(pressure.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(pressure.uniforms.uDivergence, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glDivergence!.tex);
    gl.uniform1i(pressure.uniforms.uObstacle, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#glObsTex);
    for (let i = 0; i < cfg.pressureIterations; i++) {
      gl.uniform1i(pressure.uniforms.uPressure, 2);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.#glPressure!.read.tex);
      blit(this.#glPressure!.write.fbo);
      this.#glPressure!.swap();
    }

    gradientSubtract.bind();
    gl.uniform2f(gradientSubtract.uniforms.texelSize, 1 / W, 1 / H);
    gl.uniform1i(gradientSubtract.uniforms.uPressure, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glPressure!.read.tex);
    gl.uniform1i(gradientSubtract.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity.read.tex);
    gl.uniform1i(gradientSubtract.uniforms.uObstacle, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.#glObsTex);
    blit(this.#glVelocity.write.fbo);
    this.#glVelocity.swap();

    // 6. Display
    gl.viewport(0, 0, this.#width, this.#height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT); // clear to transparent (clearColor = 0,0,0,0)

    display.bind();
    gl.uniform2f(display.uniforms.texelSize, 1 / this.#width, 1 / this.#height);
    gl.uniform3fv(display.uniforms.uWaterColor, parseColor(cfg.waterColor));
    gl.uniform3fv(display.uniforms.uGlowColor, parseColor(cfg.glowColor));
    gl.uniform1f(display.uniforms.uRefraction, cfg.refraction);
    gl.uniform1f(display.uniforms.uSpecularExp, cfg.specularExp);
    gl.uniform1f(display.uniforms.uShine, cfg.shine);
    gl.uniform1f(display.uniforms.uWarpStrength, cfg.warpStrength ?? 0.015);
    gl.uniform1i(display.uniforms.uAlgorithm, ALGORITHM_INT[cfg.algorithm] ?? 0);
    gl.uniform1i(display.uniforms.uEnableAlpha, this.#enableAlpha ? 1 : 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#glDensity.read.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#glObsTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.#glBgTex);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.#glCovTex);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.#glVelocity.read.tex);

    gl.uniform1i(display.uniforms.uTexture, 0);
    gl.uniform1i(display.uniforms.uObstacle, 1);
    gl.uniform1i(display.uniforms.uBackground, 2);
    gl.uniform1i(display.uniforms.uCoverage, 3);
    gl.uniform1i(display.uniforms.uVelocity, 4);

    blit(null);
  }
}
