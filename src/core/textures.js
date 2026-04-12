'use strict';

/**
 * Creates background + obstacle textures from a text configuration.
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @param {{ text: string, fontSize: number, color: string, fontFamily?: string, fontWeight?: string | number }} opts
 * @returns {{ backgroundTex: WebGLTexture, obstacleTex: WebGLTexture }}
 */
export function createTextTextures(gl, width, height, opts) {
  const { text, fontSize, color, fontFamily = 'sans-serif', fontWeight = 900 } = opts;

  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d');

  /** @param {string} fillColor @param {number} blur */
  const draw = (fillColor, blur = 0) => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.shadowBlur = blur;
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

  return { backgroundTex, obstacleTex };
}

/**
 * Computes draw position/size for an image within a canvas.
 * @param {number} bitmapW
 * @param {number} bitmapH
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {string | number} [size='cover'] - 'cover'|'contain'|'50%'|'200px'|number (scale factor)
 * @returns {{ x: number, y: number, drawW: number, drawH: number }}
 */
function computeImageTransform(bitmapW, bitmapH, canvasW, canvasH, size = 'cover') {
  let scale;
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
 * Creates background + obstacle textures from an ImageBitmap.
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @param {ImageBitmap} bitmap
 * @param {number} width
 * @param {number} height
 * @param {number} [effect=0.4] - obstacle brightness (0–1)
 * @param {string | number} [size='cover'] - image sizing mode
 * @returns {{ backgroundTex: WebGLTexture, obstacleTex: WebGLTexture }}
 */
export function createImageTextures(gl, bitmap, width, height, effect = 0.4, size = 'cover') {
  const tCanvas = new OffscreenCanvas(width, height);
  const ctx = tCanvas.getContext('2d');

  const { x, y, drawW, drawH } = computeImageTransform(bitmap.width, bitmap.height, width, height, size);

  // Background — full quality
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  const backgroundTex = uploadTexture(gl, tCanvas);

  // Obstacle — darkened + blurred for softer physics boundary
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = `brightness(${effect}) blur(8px)`;
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  ctx.filter = 'none';
  const obstacleTex = uploadTexture(gl, tCanvas);

  return { backgroundTex, obstacleTex };
}

/**
 * Uploads an OffscreenCanvas as an RGB texture (Y-flipped for WebGL convention).
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @param {OffscreenCanvas} source
 * @returns {WebGLTexture}
 */
function uploadTexture(gl, source) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * Fetches a URL and returns an ImageBitmap. Works on both main thread and in workers.
 * @param {string} src
 * @returns {Promise<ImageBitmap>}
 */
export async function loadImageBitmap(src) {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${src} (${response.status})`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}
