type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface TextSourceOpts {
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
  /** Oversample factor for the text canvas before upload. Higher = sharper edges. Default: 2 */
  textQuality?: number;
}

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
  const { text, fontSize, color, fontFamily = 'sans-serif', fontWeight = 900 } = opts;

  // width/height are DPR-adjusted — draw at 1:1 device pixels for crisp text
  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  const draw = (fillColor: string) => {
    if (backgroundBitmap) {
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
    } else {
      // Fill with the text colour (not black) so anti-aliased glyph edges blend
      // colour→colour instead of colour→black, eliminating the dark fringe (bug #1).
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = fillColor;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  };

  draw(color);
  const backgroundTex = uploadTextureGL(gl, tCanvas);

  // Obstacle / coverage: sharp white text on black.
  // coverageTex and obstacleTex share the same WebGLTexture — caller must NOT double-delete.
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
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
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.fillRect(
    Math.max(0, x),
    Math.max(0, y),
    Math.min(drawW, width - Math.max(0, x)),
    Math.min(drawH, height - Math.max(0, y))
  );
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
  const { text, fontSize, color, fontFamily = 'sans-serif', fontWeight = 900 } = opts;

  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  const draw = (fillColor: string) => {
    if (backgroundBitmap) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
      const { x, y, drawW, drawH } = computeImageTransform(
        backgroundBitmap.width, backgroundBitmap.height, width, height, backgroundSize
      );
      ctx.drawImage(backgroundBitmap, x, y, drawW, drawH);
    } else {
      // Fill with the text colour (not black) so anti-aliased glyph edges blend
      // colour→colour instead of colour→black, eliminating the dark fringe (bug #1).
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = fillColor;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  };

  draw(color);
  const backgroundTex = uploadTextureGPU(device, tCanvas, width, height);

  // Obstacle / coverage: sharp text — shared texture, sharedCoverage=true.
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
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

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.fillRect(Math.max(0, x), Math.max(0, y), Math.min(drawW, width - Math.max(0, x)), Math.min(drawH, height - Math.max(0, y)));
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
