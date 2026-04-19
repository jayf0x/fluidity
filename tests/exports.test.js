/**
 * Smoke test — verifies every public export exists and has the right shape.
 * This catches import errors that unit tests with mocks might miss.
 */
import { describe, expect, it } from 'vitest';

import * as pkg from '../src/index.ts';

describe('package exports', () => {
  it('exports FluidText as a React forwardRef component', () => {
    // forwardRef returns an ExoticComponent object, not a plain function
    expect(pkg.FluidText).toBeTruthy();
    expect(typeof pkg.FluidText).toBe('object');
    // React exotic components carry $$typeof
    expect(pkg.FluidText.$$typeof?.toString()).toContain('Symbol');
  });

  it('exports FluidImage as a React forwardRef component', () => {
    expect(pkg.FluidImage).toBeTruthy();
    expect(typeof pkg.FluidImage).toBe('object');
    expect(pkg.FluidImage.$$typeof?.toString()).toContain('Symbol');
  });

  it('exports useFluid as a function (hook)', () => {
    expect(typeof pkg.useFluid).toBe('function');
  });

  it('exports FluidController as a class', () => {
    expect(typeof pkg.FluidController).toBe('function');
    expect(typeof pkg.FluidController.prototype.setTextSource).toBe('function');
    expect(typeof pkg.FluidController.prototype.setImageSource).toBe('function');
    expect(typeof pkg.FluidController.prototype.setBackground).toBe('function');
    expect(typeof pkg.FluidController.prototype.handleMove).toBe('function');
    expect(typeof pkg.FluidController.prototype.splat).toBe('function');
    expect(typeof pkg.FluidController.prototype.updateConfig).toBe('function');
    expect(typeof pkg.FluidController.prototype.resize).toBe('function');
    expect(typeof pkg.FluidController.prototype.destroy).toBe('function');
  });

  it('exports FluidSimulation as a class', () => {
    expect(typeof pkg.FluidSimulation).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.setTextSource).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.setImageSource).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.setImageBitmap).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.setBackground).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.handleMove).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.splat).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.resize).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.updateConfig).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.start).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.stop).toBe('function');
    expect(typeof pkg.FluidSimulation.prototype.destroy).toBe('function');
  });

  it('exports DEFAULT_CONFIG with all expected keys', () => {
    expect(pkg.DEFAULT_CONFIG).toMatchObject({
      densityDissipation: expect.any(Number),
      velocityDissipation: expect.any(Number),
      pressureIterations: expect.any(Number),
      curl: expect.any(Number),
      splatRadius: expect.any(Number),
      splatForce: expect.any(Number),
      refraction: expect.any(Number),
      specularExp: expect.any(Number),
      shine: expect.any(Number),
      waterColor: expect.any(Array),
      glowColor: expect.any(Array),
      algorithm: expect.any(String),
      warpStrength: expect.any(Number),
    });
  });

  it('exports mergeConfig as a function', () => {
    expect(typeof pkg.mergeConfig).toBe('function');
  });

  it('has no unexpected named exports', () => {
    const expected = new Set([
      'FluidText',
      'FluidImage',
      'useFluid',
      'FluidController',
      'FluidSimulation',
      'DEFAULT_CONFIG',
      'DEFAULT_PROPS',
      'PRESETS',
      'mergeConfig',
      'loadImageBitmap',
    ]);
    for (const key of Object.keys(pkg)) {
      expect(expected.has(key), `Unexpected export: "${key}"`).toBe(true);
    }
  });
});
