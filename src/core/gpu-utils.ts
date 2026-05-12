import {
  advectionWGSL,
  curlWGSL,
  displayWGSL,
  divergenceWGSL,
  gradientSubtractWGSL,
  pressureWGSL,
  splatWGSL,
  vorticityWGSL,
} from './wgsl-shaders';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GPUTextureFBO {
  tex: GPUTexture;
  view: GPUTextureView;
  width: number;
  height: number;
}

export interface GPUDoubleFBO {
  readonly read: GPUTextureFBO;
  readonly write: GPUTextureFBO;
  swap(): void;
  dispose(): void;
}

export interface GPUPrograms {
  advection: GPURenderPipeline;
  divergence: GPURenderPipeline;
  pressure: GPURenderPipeline;
  gradientSubtract: GPURenderPipeline;
  splat: GPURenderPipeline;
  curl: GPURenderPipeline;
  vorticity: GPURenderPipeline;
  display: GPURenderPipeline;
}

// ─── Vertex buffer (fullscreen quad, triangle-list, 6 vertices) ──────────────

export const GPU_VERTEX_LAYOUT: GPUVertexBufferLayout = {
  arrayStride: 8,
  attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' as GPUVertexFormat }],
};

// Quad: two CCW triangles covering NDC [-1,1]×[-1,1]
const QUAD_VERTS = new Float32Array([
  -1, -1,  -1,  1,   1, -1,
   1, -1,  -1,  1,   1,  1,
]);

export function createGPUQuadBuffer(device: GPUDevice): GPUBuffer {
  const buf = device.createBuffer({ size: QUAD_VERTS.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(buf, 0, QUAD_VERTS);
  return buf;
}

// ─── FBO helpers ─────────────────────────────────────────────────────────────

export function createGPUTextureFBO(device: GPUDevice, format: GPUTextureFormat, w: number, h: number): GPUTextureFBO {
  const tex = device.createTexture({
    size: [w, h],
    format,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  return { tex, view: tex.createView(), width: w, height: h };
}

export function createGPUDoubleFBO(device: GPUDevice, format: GPUTextureFormat, w: number, h: number): GPUDoubleFBO {
  let r = createGPUTextureFBO(device, format, w, h);
  let wr = createGPUTextureFBO(device, format, w, h);
  return {
    get read() { return r; },
    get write() { return wr; },
    swap() { [r, wr] = [wr, r]; },
    dispose() { r.tex.destroy(); wr.tex.destroy(); },
  };
}

// ─── Pipeline factory ─────────────────────────────────────────────────────────

function makePipeline(device: GPUDevice, wgsl: string, targetFmt: GPUTextureFormat): GPURenderPipeline {
  const mod = device.createShaderModule({ code: wgsl });
  return device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: mod, entryPoint: 'vs', buffers: [GPU_VERTEX_LAYOUT] },
    fragment: { module: mod, entryPoint: 'fs', targets: [{ format: targetFmt }] },
    primitive: { topology: 'triangle-list' },
  });
}

export function createGPUPrograms(device: GPUDevice, swapFormat: GPUTextureFormat): GPUPrograms {
  const sim = 'rgba16float' as GPUTextureFormat;
  return {
    advection:       makePipeline(device, advectionWGSL,       sim),
    divergence:      makePipeline(device, divergenceWGSL,      sim),
    pressure:        makePipeline(device, pressureWGSL,        sim),
    gradientSubtract:makePipeline(device, gradientSubtractWGSL,sim),
    splat:           makePipeline(device, splatWGSL,           sim),
    curl:            makePipeline(device, curlWGSL,            sim),
    vorticity:       makePipeline(device, vorticityWGSL,       sim),
    display:         makePipeline(device, displayWGSL,         swapFormat),
  };
}

// ─── Linear sampler (shared across all passes) ───────────────────────────────

export function createGPULinearSampler(device: GPUDevice): GPUSampler {
  return device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
}

// ─── Uniform buffer helpers ───────────────────────────────────────────────────
// Each returns a pre-allocated GPUBuffer of the correct size.
// Caller writes data via device.queue.writeBuffer before each pass.

export function createUniformBuffer(device: GPUDevice, byteSize: number): GPUBuffer {
  return device.createBuffer({ size: byteSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
}

// Writes advection uniforms (16 bytes): texelSize(vec2f), dt(f32), dissipation(f32)
export function writeAdvUniforms(
  device: GPUDevice, buf: GPUBuffer,
  tsx: number, tsy: number, dt: number, dissipation: number
): void {
  const d = new Float32Array([tsx, tsy, dt, dissipation]);
  device.queue.writeBuffer(buf, 0, d);
}

// Writes texel-only uniforms (16 bytes): texelSize(vec2f), pad(vec2f)
export function writeTexelUniforms(device: GPUDevice, buf: GPUBuffer, tsx: number, tsy: number): void {
  const d = new Float32Array([tsx, tsy, 0, 0]);
  device.queue.writeBuffer(buf, 0, d);
}

// Writes vorticity uniforms (16 bytes): texelSize(vec2f), curl(f32), dt(f32)
export function writeVortUniforms(
  device: GPUDevice, buf: GPUBuffer,
  tsx: number, tsy: number, curl: number, dt: number
): void {
  const d = new Float32Array([tsx, tsy, curl, dt]);
  device.queue.writeBuffer(buf, 0, d);
}

// Writes splat uniforms (48 bytes):
//   texelSize(vec2f), aspectRatio(f32), radius(f32),
//   color(vec4f), point(vec2f), _pad(vec2f)
export function writeSplatUniforms(
  device: GPUDevice, buf: GPUBuffer,
  tsx: number, tsy: number,
  aspectRatio: number, radius: number,
  cr: number, cg: number, cb: number,
  px: number, py: number
): void {
  const d = new Float32Array(12);
  d[0] = tsx;  d[1] = tsy;
  d[2] = aspectRatio; d[3] = radius;
  d[4] = cr;   d[5] = cg; d[6] = cb; d[7] = 0;
  d[8] = px;   d[9] = py; d[10] = 0; d[11] = 0;
  device.queue.writeBuffer(buf, 0, d);
}

// Writes display uniforms (64 bytes):
//   texelSize(vec2f), refraction(f32), specularExp(f32),
//   waterColor(vec4f), glowColor(vec4f),
//   shine(f32), warpStrength(f32), algorithm(i32), _pad(f32)
export function writeDisplayUniforms(
  device: GPUDevice, buf: GPUBuffer,
  tsx: number, tsy: number,
  refraction: number, specularExp: number,
  wc: [number, number, number], gc: [number, number, number],
  shine: number, warpStrength: number, algorithm: number
): void {
  const d = new Float32Array(16);
  const di = new Int32Array(d.buffer);
  d[0] = tsx; d[1] = tsy; d[2] = refraction; d[3] = specularExp;
  d[4] = wc[0]; d[5] = wc[1]; d[6] = wc[2]; d[7] = 0;
  d[8] = gc[0]; d[9] = gc[1]; d[10] = gc[2]; d[11] = 0;
  d[12] = shine; d[13] = warpStrength;
  di[14] = algorithm; // offset 56 bytes
  // d[15] = 0; // padding
  device.queue.writeBuffer(buf, 0, d);
}

// ─── Render-to-texture helper ─────────────────────────────────────────────────

export function gpuRenderToTexture(
  encoder: GPUCommandEncoder,
  pipeline: GPURenderPipeline,
  bindGroup: GPUBindGroup,
  quadBuf: GPUBuffer,
  target: GPUTextureView,
): void {
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: target,
      clearValue: [0, 0, 0, 0],
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.setVertexBuffer(0, quadBuf);
  pass.draw(6);
  pass.end();
}

// Renders the display pass directly to the swap chain (no clear — full-screen overwrite).
export function gpuRenderDisplay(
  encoder: GPUCommandEncoder,
  pipeline: GPURenderPipeline,
  bindGroup: GPUBindGroup,
  quadBuf: GPUBuffer,
  swapView: GPUTextureView,
): void {
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: swapView,
      clearValue: [0, 0, 0, 0],
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.setVertexBuffer(0, quadBuf);
  pass.draw(6);
  pass.end();
}
