type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface TextSourceOpts {
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
}

export interface TextureSet {
  backgroundTex: WebGLTexture;
  obstacleTex: WebGLTexture;
  coverageTex: WebGLTexture;
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

  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  const draw = (fillColor: string, blur = 0) => {
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
      // ctx.filter = blur ? `brightness(0.1) blur(50px)` : '';
      ctx.drawImage(backgroundBitmap, x, y, drawW, drawH);
      // ctx.filter = '';
    } else {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.shadowColor = fillColor;
    ctx.fillStyle = fillColor;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  };

  draw(color);
  const backgroundTex = uploadTexture(gl, tCanvas);

  draw('white', 4);
  const obstacleTex = uploadTexture(gl, tCanvas);

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
  effect = 0.4,
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
  const backgroundTex = uploadTexture(gl, tCanvas);

  // ── Obstacle texture (darkened + blurred for soft physics boundary) ──────
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = `brightness(${effect}) blur(8px)`;
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  ctx.filter = 'none';
  const obstacleTex = uploadTexture(gl, tCanvas);

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
  const coverageTex = uploadTexture(gl, tCanvas);

  return { backgroundTex, obstacleTex, coverageTex };
}

function uploadTexture(gl: GL, source: OffscreenCanvas): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** Fetches a URL and returns an ImageBitmap. Works on both main thread and in workers. */
export async function loadImageBitmap(src: string): Promise<ImageBitmap> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${src} (${response.status})`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}
