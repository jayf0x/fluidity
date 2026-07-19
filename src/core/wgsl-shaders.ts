// Each shader string is a complete WGSL module containing both @vertex and @fragment entry points.
// The @vertex stage reads `texelSize` from the first 8 bytes of uniform binding 0 — every
// per-pass uniform struct starts with that field so the vertex stage can reuse the same buffer.
//
// UV convention: uv.y = 0 is the TOP of the screen (texture row 0).
// This matches WebGPU's framebuffer convention (NDC y=+1 → texture row 0) so that
// simulation FBO round-trips are consistent (no Y flip).  Source textures are uploaded
// WITHOUT flipY so their visual top also lands at uv.y = 0.

// WebGPU framebuffer convention: NDC y=+1 → texture row 0 (top).
// We flip UV.y so that uv.y=0 = top of screen = texture row 0, making
// render-to-texture round-trips consistent (no Y flip in simulation FBOs).
// Source textures are uploaded WITHOUT flipY so their row 0 (visual top)
// also lands at uv.y=0.
const SHARED_VS_STRUCT = /* wgsl */`
struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0)       uv  : vec2f,
  @location(1)       vL  : vec2f,
  @location(2)       vR  : vec2f,
  @location(3)       vT  : vec2f,
  @location(4)       vB  : vec2f,
}`;

// ─── Advection ───────────────────────────────────────────────────────────────

export const advectionWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U {
  texelSize  : vec2f,
  dt         : f32,
  dissipation: f32,
}
@group(0) @binding(0) var<uniform> u     : U;
@group(0) @binding(1) var          samp  : sampler;
@group(0) @binding(2) var          uVel  : texture_2d<f32>;
@group(0) @binding(3) var          uSrc  : texture_2d<f32>;
@group(0) @binding(4) var          uObs  : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let obs   = textureSample(uObs, samp, i.uv).r;
  let vel   = textureSample(uVel, samp, i.uv).xy;
  let coord = i.uv - u.dt * vel * u.texelSize;
  let src   = textureSample(uSrc, samp, coord);
  return u.dissipation * src * (1.0 - obs);
}
`;

// ─── Divergence ──────────────────────────────────────────────────────────────

export const divergenceWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U { texelSize: vec2f, _pad: vec2f }
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uVel : texture_2d<f32>;
@group(0) @binding(3) var          uObs : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let L = textureSample(uVel, samp, i.vL).x * (1.0 - textureSample(uObs, samp, i.vL).r);
  let R = textureSample(uVel, samp, i.vR).x * (1.0 - textureSample(uObs, samp, i.vR).r);
  let T = textureSample(uVel, samp, i.vT).y * (1.0 - textureSample(uObs, samp, i.vT).r);
  let B = textureSample(uVel, samp, i.vB).y * (1.0 - textureSample(uObs, samp, i.vB).r);
  return vec4f(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`;

// ─── Pressure ────────────────────────────────────────────────────────────────

export const pressureWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U { texelSize: vec2f, _pad: vec2f }
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uPres: texture_2d<f32>;
@group(0) @binding(3) var          uDiv : texture_2d<f32>;
@group(0) @binding(4) var          uObs : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let C  = textureSample(uPres, samp, i.uv).x;
  let L  = mix(textureSample(uPres, samp, i.vL).x, C, textureSample(uObs, samp, i.vL).r);
  let R  = mix(textureSample(uPres, samp, i.vR).x, C, textureSample(uObs, samp, i.vR).r);
  let T  = mix(textureSample(uPres, samp, i.vT).x, C, textureSample(uObs, samp, i.vT).r);
  let B  = mix(textureSample(uPres, samp, i.vB).x, C, textureSample(uObs, samp, i.vB).r);
  let dv = textureSample(uDiv, samp, i.uv).x;
  return vec4f((L + R + B + T - dv) * 0.25, 0.0, 0.0, 1.0);
}
`;

// ─── Gradient subtract ───────────────────────────────────────────────────────

export const gradientSubtractWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U { texelSize: vec2f, _pad: vec2f }
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uPres: texture_2d<f32>;
@group(0) @binding(3) var          uVel : texture_2d<f32>;
@group(0) @binding(4) var          uObs : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let obs = textureSample(uObs, samp, i.uv).r;
  let C   = textureSample(uPres, samp, i.uv).x;
  let L   = mix(textureSample(uPres, samp, i.vL).x, C, textureSample(uObs, samp, i.vL).r);
  let R   = mix(textureSample(uPres, samp, i.vR).x, C, textureSample(uObs, samp, i.vR).r);
  let T   = mix(textureSample(uPres, samp, i.vT).x, C, textureSample(uObs, samp, i.vT).r);
  let B   = mix(textureSample(uPres, samp, i.vB).x, C, textureSample(uObs, samp, i.vB).r);
  var vel = textureSample(uVel, samp, i.uv).xy - vec2f(R - L, T - B);

  // Slip boundary condition: decompose into normal/tangential via the obstacle
  // gradient (surface normal) and only damp the normal component at the boundary,
  // preserving tangential flow so fluid slides along obstacle edges (no-slip off).
  let obsGrad = vec2f(
    textureSample(uObs, samp, i.vR).r - textureSample(uObs, samp, i.vL).r,
    textureSample(uObs, samp, i.vT).r - textureSample(uObs, samp, i.vB).r
  );
  let gradLen = length(obsGrad);
  let normal  = select(vec2f(0.0), obsGrad / gradLen, gradLen > 0.0001);
  let velN    = dot(vel, normal);
  let velTang = vel - velN * normal;
  vel = mix(vel, velTang, obs);

  return vec4f(vel, 0.0, 1.0);
}
`;

// ─── Splat ───────────────────────────────────────────────────────────────────

export const splatWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

// texelSize occupies bytes 0-7 for the shared vertex stage; aspectRatio/radius fill the rest.
struct U {
  texelSize  : vec2f,
  aspectRatio: f32,
  radius     : f32,
  color      : vec4f,  // xyz = colour, w unused
  point      : vec2f,
  _pad       : vec2f,
}
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uTgt : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  var p  = i.uv - u.point;
  p.x   *= u.aspectRatio;
  let sp = exp(-dot(p, p) / u.radius) * u.color.xyz;
  return vec4f(textureSample(uTgt, samp, i.uv).xyz + sp, 1.0);
}
`;

// ─── Curl ────────────────────────────────────────────────────────────────────

export const curlWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U { texelSize: vec2f, _pad: vec2f }
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uVel : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let L = textureSample(uVel, samp, i.vL).y;
  let R = textureSample(uVel, samp, i.vR).y;
  let T = textureSample(uVel, samp, i.vT).x;
  let B = textureSample(uVel, samp, i.vB).x;
  return vec4f(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`;

// ─── Blur ────────────────────────────────────────────────────────────────────
// Separable Gaussian, one axis per pass (direction = (1,0) then (0,1)).
// Pre-blurs the density FBO for smoother display-pass normals; raw density
// (uTex in displayWGSL) still drives colour/alpha directly.

export const blurWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U { texelSize: vec2f, direction: vec2f }
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uSrc : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let off = u.direction * u.texelSize;
  let sum = textureSample(uSrc, samp, i.uv).r * 0.38774
    + textureSample(uSrc, samp, i.uv + off).r * 0.24477
    + textureSample(uSrc, samp, i.uv - off).r * 0.24477
    + textureSample(uSrc, samp, i.uv + off * 2.0).r * 0.06136
    + textureSample(uSrc, samp, i.uv - off * 2.0).r * 0.06136;
  return vec4f(sum, 0.0, 0.0, 1.0);
}
`;

// ─── Vorticity ───────────────────────────────────────────────────────────────

export const vorticityWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U {
  texelSize: vec2f,
  curl     : f32,
  dt       : f32,
}
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uVel : texture_2d<f32>;
@group(0) @binding(3) var          uCrl : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let L     = textureSample(uCrl, samp, i.vL).x;
  let R     = textureSample(uCrl, samp, i.vR).x;
  let T     = textureSample(uCrl, samp, i.vT).x;
  let B     = textureSample(uCrl, samp, i.vB).x;
  let C     = textureSample(uCrl, samp, i.uv).x;
  var force = 0.5 * vec2f(abs(T) - abs(B), abs(R) - abs(L));
  force    /= length(force) + 0.0001;
  force    *= u.curl * 30.0 * C;
  let vel   = textureSample(uVel, samp, i.uv).xy + force * u.dt;
  return vec4f(vel, 0.0, 1.0);
}
`;

// ─── Display ─────────────────────────────────────────────────────────────────
// Mirrors the GLSL displayShader with 5 algorithms (0=standard … 4=ripple).
// Uniform layout (64 bytes, aligned):
//   0  texelSize   vec2f
//   8  refraction  f32
//  12  specularExp f32
//  16  waterColor  vec4f  (w = alpha, scales output alpha)
//  32  glowColor   vec4f  (w unused)
//  48  shine       f32
//  52  warpStrength f32
//  56  algorithm   i32
//  60  enableAlpha i32    (1 = premultiplied alpha output, 0 = opaque)

export const displayWGSL = /* wgsl */`
${SHARED_VS_STRUCT}

struct U {
  texelSize   : vec2f,
  refraction  : f32,
  specularExp : f32,
  waterColor  : vec4f,
  glowColor   : vec4f,
  shine       : f32,
  warpStrength: f32,
  algorithm   : i32,
  enableAlpha : i32,
}
@group(0) @binding(0) var<uniform> u    : U;
@group(0) @binding(1) var          samp : sampler;
@group(0) @binding(2) var          uTex : texture_2d<f32>;
@group(0) @binding(3) var          uObs : texture_2d<f32>;
@group(0) @binding(4) var          uBg  : texture_2d<f32>;
@group(0) @binding(5) var          uCov : texture_2d<f32>;
@group(0) @binding(6) var          uVel : texture_2d<f32>;
@group(0) @binding(7) var          uDensBlur : texture_2d<f32>;

@vertex fn vs(@location(0) a: vec2f) -> VSOut {
  var o: VSOut;
  o.uv = vec2f(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
  o.vL = o.uv - vec2f(u.texelSize.x, 0.0);
  o.vR = o.uv + vec2f(u.texelSize.x, 0.0);
  o.vT = o.uv + vec2f(0.0, u.texelSize.y);
  o.vB = o.uv - vec2f(0.0, u.texelSize.y);
  o.pos = vec4f(a, 0.0, 1.0);
  return o;
}

@fragment fn fs(i: VSOut) -> @location(0) vec4f {
  let obs     = textureSample(uObs, samp, i.uv).r;
  let density = max(textureSample(uTex, samp, i.uv).r, 0.0) * (1.0 - obs);
  let cov     = textureSample(uCov, samp, i.uv).r;

  // Sobel taps sample the pre-blurred density (uDensBlur, see blurWGSL) for a smooth
  // gradient; raw density above still drives colour/alpha. Spread stays density-aware:
  // wider at low density (smooth noisy gradient), tight at high (sharp specular).
  let sobelSpread = clamp(3.0 / max(density, 0.3), 1.5, 6.0);
  let sx  = u.texelSize.x * sobelSpread;
  let sy  = u.texelSize.y * sobelSpread;
  let d00 = max(textureSample(uDensBlur, samp, i.uv + vec2f(-sx, -sy)).r, 0.0);
  let d10 = max(textureSample(uDensBlur, samp, i.uv + vec2f(0.0, -sy)).r, 0.0);
  let d20 = max(textureSample(uDensBlur, samp, i.uv + vec2f( sx, -sy)).r, 0.0);
  let d01 = max(textureSample(uDensBlur, samp, i.uv + vec2f(-sx, 0.0)).r, 0.0);
  let d21 = max(textureSample(uDensBlur, samp, i.uv + vec2f( sx, 0.0)).r, 0.0);
  let d02 = max(textureSample(uDensBlur, samp, i.uv + vec2f(-sx,  sy)).r, 0.0);
  let d12 = max(textureSample(uDensBlur, samp, i.uv + vec2f(0.0,  sy)).r, 0.0);
  let d22 = max(textureSample(uDensBlur, samp, i.uv + vec2f( sx,  sy)).r, 0.0);
  let gx  = (d20 + 2.0*d21 + d22) - (d00 + 2.0*d01 + d02);
  let gy  = (d02 + 2.0*d12 + d22) - (d00 + 2.0*d10 + d20);

  let norm    = normalize(vec3f(gx, gy, 1.2));
  let ldir    = normalize(vec3f(0.5, 1.0, 0.5));
  let halfV   = normalize(ldir + vec3f(0.0, 0.0, 1.0));
  let specDen = density * min(density * 5.0, 1.0);
  let spec    = pow(max(dot(norm, halfV), 0.0), u.specularExp) * u.shine * specDen;

  let bgRaw = textureSample(uBg, samp, i.uv).rgb;
  let wc    = u.waterColor.rgb;
  let gc    = u.glowColor.rgb;
  let bg    = mix(wc, bgRaw, cov);
  var color = bg;

  if (u.algorithm == 1) {
    let ruv = clamp(i.uv + norm.xy * u.refraction * density * 3.0, vec2f(0.0), vec2f(1.0));
    let rbg = mix(wc, textureSample(uBg, samp, mix(i.uv, ruv, 1.0 - obs)).rgb, cov);
    color   = rbg + spec * gc * 2.5;
    color   = mix(color, bg * 0.6, obs * 0.3);
  } else if (u.algorithm == 2) {
    let inkD = min(density * 4.0, 1.0);
    let ruv  = clamp(i.uv + norm.xy * u.refraction * density * 0.4, vec2f(0.0), vec2f(1.0));
    let rbg  = mix(wc, textureSample(uBg, samp, mix(i.uv, ruv, 1.0 - obs)).rgb, cov);
    color    = mix(rbg, wc + spec * gc, inkD);
    color    = mix(color, bg * 0.5, obs * 0.15);
  } else if (u.algorithm == 3) {
    let vel    = textureSample(uVel, samp, i.uv).xy;
    let velMag = clamp(length(vel) * 20.0, 0.0, 1.0);
    let wuv    = clamp(i.uv + vel * u.warpStrength, vec2f(0.0), vec2f(1.0));
    let wbg    = mix(wc, textureSample(uBg, samp, wuv).rgb, cov);
    color      = mix(bg, wbg, velMag * (1.0 - obs));
    color     += spec * gc * velMag * 1.5;
    color     += wc * density * 0.3;
    color      = mix(color, bg * 0.5, obs * 0.2);
  } else if (u.algorithm == 4) {
    let ruv   = clamp(i.uv + norm.xy * u.refraction * density * 6.0, vec2f(0.0), vec2f(1.0));
    let rbg   = mix(wc, textureSample(uBg, samp, mix(i.uv, ruv, 1.0 - obs)).rgb, cov);
    let fres  = pow(clamp(1.0 - dot(norm, vec3f(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0) * density;
    color     = rbg;
    color    += fres * gc * 2.0;
    color    += spec * gc * density * 2.0;
    color     = mix(color, bg * 0.5, obs * 0.2);
  } else {
    let ruv = i.uv + norm.xy * u.refraction * density;
    let rbg = mix(wc, textureSample(uBg, samp, mix(i.uv, ruv, 1.0 - obs)).rgb, cov);
    color   = mix(rbg, wc, min(density * 1.5, 0.8));
    color  += spec * gc;
    color   = mix(color, bg * 0.5, obs * 0.2);
  }

  let alpha = clamp(max(density * 1.5, cov), 0.0, 1.0) * u.waterColor.w;
  if (u.enableAlpha == 1) {
    return vec4f(color * alpha, alpha);
  }
  return vec4f(color, 1.0);
}
`;
