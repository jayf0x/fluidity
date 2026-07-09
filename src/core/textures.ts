type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface TextSourceOpts {
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right';
  /** Oversample factor for the text canvas before upload. Higher = sharper edges. Default: 1 */
  textQuality?: number;
  /**
   * Edge softness (device px) applied to the glyph draw. Softens the AA edge so
   * colour doesn't blend into a dark fringe against the black backdrop. Clamped to
   * [0, 2] — beyond that the glyph itself starts reading as blurry. Default: 1.
   */
  textBlur?: number;
}

export const DEFAULT_TEXT_BLUR = 1;
const MAX_TEXT_BLUR = 2;

export interface TextureSet {
  backgroundTex: WebGLTexture;
  obstacleTex: WebGLTexture;
  coverageTex: WebGLTexture;
}

export interface GPUTextureSet {
  backgroundTex: GPUTexture;
  backgroundView: GPUTextureView;
  obstacleTex: GPUTexture;
  obstacleView: GPUTextureView;
  coverageTex: GPUTexture;
  coverageView: GPUTextureView;
  /** True when coverageTex === obstacleTex (text mode — caller must not double-destroy). */
  sharedCoverage: boolean;
}

/**
 * Computes draw position/size for an image within a canvas.
 * Exported so simulation can reuse it for background image sizing.
 */
export function computeImageTransform(
  bitmapW: number,
  bitmapH: number,
  canvasW: number,
  canvasH: number,
  size: string | number = 'cover'
): { x: number; y: number; drawW: number; drawH: number } {
  let scale: number;
  if (size === 'cover') {
    scale = Math.max(canvasW / bitmapW, canvasH / bitmapH);
  } else if (size === 'contain') {
    scale = Math.min(canvasW / bitmapW, canvasH / bitmapH);
  } else if (typeof size === 'string' && size.endsWith('%')) {
    scale = Math.min(canvasW / bitmapW, canvasH / bitmapH) * (parseFloat(size) / 100);
  } else if (typeof size === 'string' && size.endsWith('px')) {
    scale = parseFloat(size) / Math.max(bitmapW, bitmapH);
  } else if (typeof size === 'number') {
    scale = size;
  } else {
    scale = Math.max(canvasW / bitmapW, canvasH / bitmapH);
  }
  const drawW = bitmapW * scale;
  const drawH = bitmapH * scale;
  return { x: (canvasW - drawW) / 2, y: (canvasH - drawH) / 2, drawW, drawH };
}

// ─── Shared text drawing helper ──────────────────────────────────────────────

/**
 * Draws `text` into `ctx` (a `width × height` canvas) with optional oversampling.
 * When `quality > 1`, renders to a larger OffscreenCanvas then scales down for
 * sub-pixel anti-aliasing without blurring the upload texture dimensions.
 */
function drawTextToCanvas(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  bgColor: string,
  textColor: string,
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number,
  align: 'left' | 'center' | 'right',
  quality: number,
  blurPx = 0
): void {
  const tq = Math.max(1, quality);
  const ow = Math.round(width * tq);
  const oh = Math.round(height * tq);
  const x = align === 'left' ? 0 : align === 'right' ? ow : ow / 2;

  if (tq > 1) {
    const oCanvas = new OffscreenCanvas(ow, oh);
    const oCtx = oCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    oCtx.fillStyle = bgColor;
    oCtx.fillRect(0, 0, ow, oh);
    // Blurring the glyph draw (not the backdrop fill above) softens the AA edge into
    // a gradient instead of a hard dark fringe against the black backdrop.
    oCtx.filter = blurPx > 0 ? `blur(${blurPx * tq}px)` : 'none';
    oCtx.fillStyle = textColor;
    oCtx.font = `${fontWeight} ${fontSize * tq}px ${fontFamily}`;
    oCtx.textAlign = align;
    oCtx.textBaseline = 'middle';
    oCtx.fillText(text, x, oh / 2);
    oCtx.filter = 'none';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(oCanvas, 0, 0, width, height);
    return;
  }

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
  ctx.fillStyle = textColor;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, height / 2);
  ctx.filter = 'none';
}

/**
 * Paints a black canvas with a white rect over `[x, y, w, h]` — the binary
 * content-bounds mask used for CSS `backgroundColor` passthrough in image mode.
 */
function fillRectCoverage(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  const cx = Math.max(0, x);
  const cy = Math.max(0, y);
  ctx.fillRect(cx, cy, Math.min(w, width - cx), Math.min(h, height - cy));
}

// ─── WebGL texture creation ───────────────────────────────────────────────────

/**
 * Creates background + obstacle + coverage textures from a text configuration.
 *
 * coverageTex is the same object as obstacleTex (text mask doubles as coverage).
 * The caller must NOT double-delete it.
 */
export function createTextTextures(
  gl: GL,
  width: number,
  height: number,
  opts: TextSourceOpts,
  backgroundBitmap: ImageBitmap | null = null,
  backgroundSize: string | number = 'cover'
): TextureSet {
  const {
    text, fontSize, color,
    fontFamily = 'sans-serif', fontWeight = 900, textAlign = 'center', textQuality = 1,
    textBlur: rawTextBlur = DEFAULT_TEXT_BLUR,
  } = opts;
  const textBlur = Math.min(Math.max(rawTextBlur, 0), MAX_TEXT_BLUR);

  // width/height are DPR-adjusted — draw at 1:1 device pixels for crisp text
  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  const draw = (fillColor: string) => {
    if (backgroundBitmap) {
      // The coverage mask clips the colour texture to the glyph shape, so the
      // image only needs to cover the canvas — the glyphs become a window onto it.
      // Painting the text colour over the glyphs here would hide the image (bug #2).
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
      const { x, y, drawW, drawH } = computeImageTransform(
        backgroundBitmap.width,
        backgroundBitmap.height,
        width,
        height,
        backgroundSize
      );
      ctx.drawImage(backgroundBitmap, x, y, drawW, drawH);
      return;
    }
    // bgColor='black' + a soft blur on the glyph draw softens the AA edge into a
    // gradient instead of a hard dark fringe against the black backdrop.
    drawTextToCanvas(ctx, width, height, 'black', fillColor, text, fontSize, fontFamily, fontWeight, textAlign, textQuality, textBlur);
  };

  draw(color);
  const backgroundTex = uploadTextureGL(gl, tCanvas);

  // Obstacle / coverage: sharp white text on black.
  // coverageTex and obstacleTex share the same WebGLTexture — caller must NOT double-delete.
  drawTextToCanvas(ctx, width, height, 'black', 'white', text, fontSize, fontFamily, fontWeight, textAlign, textQuality, textBlur);
  const obstacleTex = uploadTextureGL(gl, tCanvas);

  return { backgroundTex, obstacleTex, coverageTex: obstacleTex };
}

/**
 * Creates background + obstacle + coverage textures from an ImageBitmap.
 *
 * coverageTex is a separate binary rect mask (white inside image bounds, black outside)
 * so CSS backgroundColor is visible around the image when imageSize is not 'cover'.
 */
export function createImageTextures(
  gl: GL,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  effect = 0.0,
  size: string | number = 'cover',
  backgroundBitmap: ImageBitmap | null = null,
  backgroundSize: string | number = 'cover'
): TextureSet {
  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  const { x, y, drawW, drawH } = computeImageTransform(bitmap.width, bitmap.height, width, height, size);

  // ── Background texture ───────────────────────────────────────────────────
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  if (backgroundBitmap) {
    const {
      x: bx,
      y: by,
      drawW: bw,
      drawH: bh,
    } = computeImageTransform(backgroundBitmap.width, backgroundBitmap.height, width, height, backgroundSize);
    ctx.filter = `brightness(${effect}) blur(8px)`;
    ctx.drawImage(backgroundBitmap, bx, by, bw, bh);
    ctx.filter = 'none';
  }
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  const backgroundTex = uploadTextureGL(gl, tCanvas);

  // ── Obstacle texture (darkened + blurred for soft physics boundary) ──────
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = `brightness(${effect}) blur(8px)`;
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  ctx.filter = 'none';
  const obstacleTex = uploadTextureGL(gl, tCanvas);

  // ── Coverage texture (binary rect mask for transparency) ─────────────────
  fillRectCoverage(ctx, width, height, x, y, drawW, drawH);
  const coverageTex = uploadTextureGL(gl, tCanvas);

  return { backgroundTex, obstacleTex, coverageTex };
}

function uploadTextureGL(gl: GL, source: OffscreenCanvas): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// ─── WebGPU texture creation ──────────────────────────────────────────────────

/**
 * Creates background + obstacle + coverage GPUTextures from a text configuration.
 * coverageTex is the SAME GPUTexture as obstacleTex; sharedCoverage=true signals
 * the caller must not destroy both.
 */
export function createTextTexturesGPU(
  device: GPUDevice,
  width: number,
  height: number,
  opts: TextSourceOpts,
  backgroundBitmap: ImageBitmap | null = null,
  backgroundSize: string | number = 'cover'
): GPUTextureSet {
  const {
    text, fontSize, color,
    fontFamily = 'sans-serif', fontWeight = 900, textAlign = 'center', textQuality = 1,
    textBlur: rawTextBlur = DEFAULT_TEXT_BLUR,
  } = opts;
  const textBlur = Math.min(Math.max(rawTextBlur, 0), MAX_TEXT_BLUR);

  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  const draw = (fillColor: string) => {
    if (backgroundBitmap) {
      // Coverage clips the colour texture to the glyph shape — glyphs become a
      // window onto the image. Painting text colour over them hides it (bug #2).
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
      const { x, y, drawW, drawH } = computeImageTransform(
        backgroundBitmap.width, backgroundBitmap.height, width, height, backgroundSize
      );
      ctx.drawImage(backgroundBitmap, x, y, drawW, drawH);
      return;
    }
    // bgColor='black' + a soft blur on the glyph draw softens the AA edge into a
    // gradient instead of a hard dark fringe against the black backdrop.
    drawTextToCanvas(ctx, width, height, 'black', fillColor, text, fontSize, fontFamily, fontWeight, textAlign, textQuality, textBlur);
  };

  draw(color);
  const backgroundTex = uploadTextureGPU(device, tCanvas, width, height);

  // Obstacle / coverage: sharp text — shared texture, sharedCoverage=true.
  drawTextToCanvas(ctx, width, height, 'black', 'white', text, fontSize, fontFamily, fontWeight, textAlign, textQuality, textBlur);
  const obstacleTex = uploadTextureGPU(device, tCanvas, width, height);

  return {
    backgroundTex,
    backgroundView: backgroundTex.createView(),
    obstacleTex,
    obstacleView: obstacleTex.createView(),
    coverageTex: obstacleTex,
    coverageView: obstacleTex.createView(),
    sharedCoverage: true,
  };
}

/**
 * Creates background + obstacle + coverage GPUTextures from an ImageBitmap.
 */
export function createImageTexturesGPU(
  device: GPUDevice,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  effect = 0.0,
  size: string | number = 'cover',
  backgroundBitmap: ImageBitmap | null = null,
  backgroundSize: string | number = 'cover'
): GPUTextureSet {
  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  const { x, y, drawW, drawH } = computeImageTransform(bitmap.width, bitmap.height, width, height, size);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  if (backgroundBitmap) {
    const { x: bx, y: by, drawW: bw, drawH: bh } = computeImageTransform(
      backgroundBitmap.width, backgroundBitmap.height, width, height, backgroundSize
    );
    ctx.filter = `brightness(${effect}) blur(8px)`;
    ctx.drawImage(backgroundBitmap, bx, by, bw, bh);
    ctx.filter = 'none';
  }
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  const backgroundTex = uploadTextureGPU(device, tCanvas, width, height);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = `brightness(${effect}) blur(8px)`;
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  ctx.filter = 'none';
  const obstacleTex = uploadTextureGPU(device, tCanvas, width, height);

  fillRectCoverage(ctx, width, height, x, y, drawW, drawH);
  const coverageTex = uploadTextureGPU(device, tCanvas, width, height);

  return {
    backgroundTex,
    backgroundView: backgroundTex.createView(),
    obstacleTex,
    obstacleView: obstacleTex.createView(),
    coverageTex,
    coverageView: coverageTex.createView(),
    sharedCoverage: false,
  };
}

function uploadTextureGPU(device: GPUDevice, source: OffscreenCanvas, width: number, height: number): GPUTexture {
  const tex = device.createTexture({
    size: [width, height],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  // No flipY: with the WGSL vertex shader's flipped UV.y (uv.y=0 = top),
  // source row 0 (visual top) maps naturally to texture row 0 = uv.y=0 = screen top.
  device.queue.copyExternalImageToTexture(
    { source },
    { texture: tex },
    [width, height]
  );
  return tex;
}

/** Fetches a URL and returns an ImageBitmap. Works on both main thread and in workers. */
export async function loadImageBitmap(src: string): Promise<ImageBitmap> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${src} (${response.status})`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}
