import { describe, expect, it } from 'vitest';
import { fitWithin } from './thumbnailer';

describe('fitWithin', () => {
  it('fits a landscape box by width', () => {
    expect(fitWithin(2000, 1000, 320)).toEqual({ width: 320, height: 160 });
  });

  it('fits a portrait box by height', () => {
    expect(fitWithin(1000, 2000, 320)).toEqual({ width: 160, height: 320 });
  });

  it('fits a square box exactly', () => {
    expect(fitWithin(500, 500, 320)).toEqual({ width: 320, height: 320 });
  });

  it('scales a small source up to the edge (consistent shelf covers)', () => {
    expect(fitWithin(100, 50, 320)).toEqual({ width: 320, height: 160 });
  });

  it('never returns a zero dimension for an extreme aspect ratio', () => {
    const thin = fitWithin(10000, 1, 320);
    expect(thin.width).toBeGreaterThanOrEqual(1);
    expect(thin.height).toBeGreaterThanOrEqual(1);
  });

  it('returns a zero box for degenerate input instead of NaN', () => {
    expect(fitWithin(0, 100, 320)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(100, 100, 0)).toEqual({ width: 0, height: 0 });
  });
});
