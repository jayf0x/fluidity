import { describe, it, expect, vi } from 'vitest';
import { Program, createFBO, createDoubleFBO, createBlit } from '../../src/core/gl-utils.ts';
import { createWebGLMock } from '../setup.js';

describe('Program', () => {
  it('creates and links a program', () => {
    const gl = createWebGLMock();
    gl.getProgramParameter.mockReturnValue(0); // 0 uniforms

    const prog = new Program(gl, 'void main(){}', 'void main(){}');

    expect(gl.createProgram).toHaveBeenCalledOnce();
    expect(gl.attachShader).toHaveBeenCalledTimes(2);
    expect(gl.linkProgram).toHaveBeenCalledOnce();
    expect(prog.uniforms).toEqual({});
  });

  it('caches uniform locations', () => {
    const gl = createWebGLMock();
    gl.getProgramParameter.mockReturnValue(2);
    gl.getActiveUniform
      .mockReturnValueOnce({ name: 'uTime' })
      .mockReturnValueOnce({ name: 'uResolution' });
    const mockLoc = {};
    gl.getUniformLocation.mockReturnValue(mockLoc);

    const prog = new Program(gl, 'void main(){}', 'void main(){}');

    expect(prog.uniforms).toHaveProperty('uTime', mockLoc);
    expect(prog.uniforms).toHaveProperty('uResolution', mockLoc);
  });

  it('binds the program', () => {
    const gl = createWebGLMock();
    gl.getProgramParameter.mockReturnValue(0);
    const prog = new Program(gl, '', '');

    prog.bind();
    expect(gl.useProgram).toHaveBeenCalledWith(prog.program);
  });

  it('disposes the program', () => {
    const gl = createWebGLMock();
    gl.getProgramParameter.mockReturnValue(0);
    const prog = new Program(gl, '', '');

    prog.dispose();
    expect(gl.deleteProgram).toHaveBeenCalledWith(prog.program);
  });
});

describe('createFBO', () => {
  it('creates a texture and framebuffer', () => {
    const gl = createWebGLMock();
    const ext = { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };

    const fbo = createFBO(gl, ext, 128, 64);

    expect(gl.createTexture).toHaveBeenCalledOnce();
    expect(gl.createFramebuffer).toHaveBeenCalledOnce();
    expect(fbo).toMatchObject({ width: 128, height: 64 });
    expect(fbo.tex).toBeDefined();
    expect(fbo.fbo).toBeDefined();
  });

  it('sets correct texture parameters', () => {
    const gl = createWebGLMock();
    const ext = { internalFormat: gl.RGBA, format: gl.RGBA, type: gl.HALF_FLOAT };

    createFBO(gl, ext, 64, 64);

    // LINEAR filter + CLAMP_TO_EDGE wrapping
    expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  });
});

describe('createDoubleFBO', () => {
  it('exposes read/write and swap', () => {
    const gl = createWebGLMock();
    const ext = { internalFormat: gl.RGBA, format: gl.RGBA, type: gl.HALF_FLOAT };

    const dfbo = createDoubleFBO(gl, ext, 64, 64);
    const readBefore = dfbo.read;
    const writeBefore = dfbo.write;

    dfbo.swap();

    expect(dfbo.read).toBe(writeBefore);
    expect(dfbo.write).toBe(readBefore);
  });

  it('disposes both FBOs', () => {
    const gl = createWebGLMock();
    const ext = { internalFormat: gl.RGBA, format: gl.RGBA, type: gl.HALF_FLOAT };
    const dfbo = createDoubleFBO(gl, ext, 64, 64);

    dfbo.dispose();

    expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(2);
  });
});

describe('createBlit', () => {
  it('creates a buffer and sets up vertex attribs once', () => {
    const gl = createWebGLMock();
    createBlit(gl);

    expect(gl.createBuffer).toHaveBeenCalledOnce();
    expect(gl.bufferData).toHaveBeenCalledOnce();
    expect(gl.vertexAttribPointer).toHaveBeenCalledOnce();
    expect(gl.enableVertexAttribArray).toHaveBeenCalledOnce();
  });

  it('returns a function that binds FBO and draws', () => {
    const gl = createWebGLMock();
    const blit = createBlit(gl);
    const mockFBO = {};

    blit(mockFBO);

    expect(gl.bindFramebuffer).toHaveBeenCalledWith(gl.FRAMEBUFFER, mockFBO);
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_FAN, 0, 4);
  });

  it('does NOT re-call vertexAttribPointer on subsequent blits', () => {
    const gl = createWebGLMock();
    const blit = createBlit(gl);

    blit(null);
    blit(null);
    blit(null);

    // Still only once from setup
    expect(gl.vertexAttribPointer).toHaveBeenCalledOnce();
  });
});
