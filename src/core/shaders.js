'use strict';

export const baseVertexShader = /* glsl */ `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const advectionShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform sampler2D uObstacle;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;
  void main () {
    if (texture2D(uObstacle, vUv).r > 0.5) { gl_FragColor = vec4(0.0); return; }
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    gl_FragColor = dissipation * texture2D(uSource, coord);
  }
`;

export const divergenceShader = /* glsl */ `
  precision highp float;
  varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uObstacle;
  void main () {
    float L = texture2D(uObstacle, vL).r > 0.5 ? 0.0 : texture2D(uVelocity, vL).x;
    float R = texture2D(uObstacle, vR).r > 0.5 ? 0.0 : texture2D(uVelocity, vR).x;
    float T = texture2D(uObstacle, vT).r > 0.5 ? 0.0 : texture2D(uVelocity, vT).y;
    float B = texture2D(uObstacle, vB).r > 0.5 ? 0.0 : texture2D(uVelocity, vB).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`;

export const pressureShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform sampler2D uObstacle;
  void main () {
    float C = texture2D(uPressure, vUv).x;
    float L = texture2D(uObstacle, vL).r > 0.5 ? C : texture2D(uPressure, vL).x;
    float R = texture2D(uObstacle, vR).r > 0.5 ? C : texture2D(uPressure, vR).x;
    float T = texture2D(uObstacle, vT).r > 0.5 ? C : texture2D(uPressure, vT).x;
    float B = texture2D(uObstacle, vB).r > 0.5 ? C : texture2D(uPressure, vB).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
  }
`;

export const gradientSubtractShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform sampler2D uObstacle;
  void main () {
    if (texture2D(uObstacle, vUv).r > 0.5) { gl_FragColor = vec4(0.0); return; }
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

export const splatShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
  }
`;

export const curlShader = /* glsl */ `
  precision highp float;
  varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`;

export const vorticityShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    gl_FragColor = vec4(texture2D(uVelocity, vUv).xy + force * dt, 0.0, 1.0);
  }
`;

export const displayShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform sampler2D uObstacle;
  uniform sampler2D uBackground;
  uniform vec2 texelSize;
  uniform vec3 uWaterColor;
  uniform vec3 uGlowColor;
  uniform float uRefraction;
  uniform float uSpecularExp;
  uniform float uShine;

  void main () {
    float density = texture2D(uTexture, vUv).r;
    float obs = texture2D(uObstacle, vUv).r;

    float dL = texture2D(uTexture, vUv - vec2(texelSize.x * 2.0, 0.0)).r;
    float dR = texture2D(uTexture, vUv + vec2(texelSize.x * 2.0, 0.0)).r;
    float dT = texture2D(uTexture, vUv + vec2(0.0, texelSize.y * 2.0)).r;
    float dB = texture2D(uTexture, vUv - vec2(0.0, texelSize.y * 2.0)).r;

    vec3 normal = normalize(vec3(dL - dR, dB - dT, 0.2));

    vec2 refrUv = vUv + normal.xy * uRefraction * density;
    vec3 bg = texture2D(uBackground, mix(vUv, refrUv, 1.0 - obs)).rgb;

    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfV = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfV), 0.0), uSpecularExp) * uShine * density;

    vec3 color = mix(bg, uWaterColor, min(density * 1.5, 0.8));
    color += spec * uGlowColor;
    color = mix(color, bg * 0.5, obs * 0.2);

    gl_FragColor = vec4(color, 1.0);
  }
`;
