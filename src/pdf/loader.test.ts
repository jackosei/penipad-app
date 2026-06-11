import { describe, expect, it, vi } from 'vitest';
import { PageCache, classifyPdfError, computeRenderScale, copyPdfBytes } from './loader';
import { PDF } from '@/constants';

describe('copyPdfBytes', () => {
  it('copies a Uint8Array so the original survives worker transfer', () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const copy = copyPdfBytes(original);

    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.buffer).not.toBe(original.buffer);
  });

  it('copies an ArrayBuffer', () => {
    const buffer = new Uint8Array([9, 8, 7]).buffer;
    const copy = copyPdfBytes(buffer);

    expect([...copy]).toEqual([9, 8, 7]);
    expect(copy.buffer).not.toBe(buffer);
  });

  it('detaching the copy leaves the original intact (the transfer scenario)', () => {
    const original = new Uint8Array([5, 6, 7, 8]);
    const copy = copyPdfBytes(original);

    // Simulate what pdf.js does: transfer the copy's buffer away.
    structuredClone(copy.buffer, { transfer: [copy.buffer] });

    expect(copy.buffer.byteLength).toBe(0); // detached
    expect([...original]).toEqual([5, 6, 7, 8]); // untouched
  });
});

describe('computeRenderScale', () => {
  // A4 at pdf.js scale 1: 595.28 x 841.89 CSS px. Round for test clarity.
  const a4 = { baseWidth: 595, baseHeight: 842 };

  it('scales to the target CSS width times the device pixel ratio', () => {
    const scale = computeRenderScale({ ...a4, cssWidth: 1190, devicePixelRatio: 2 });
    expect(scale).toBeCloseTo(4, 5);
  });

  it('clamps the scale so the canvas stays under the pixel budget', () => {
    const scale = computeRenderScale({
      ...a4,
      cssWidth: 4000,
      devicePixelRatio: 3,
      maxPixels: PDF.MAX_RENDER_PIXELS,
    });
    const pixels = a4.baseWidth * scale * (a4.baseHeight * scale);
    expect(pixels).toBeLessThanOrEqual(PDF.MAX_RENDER_PIXELS * 1.0001);
    // And it should have actually clamped, not just passed through.
    expect(scale).toBeLessThan((4000 * 3) / a4.baseWidth);
  });

  it('treats a non-positive devicePixelRatio as 1', () => {
    const scale = computeRenderScale({ ...a4, cssWidth: 595, devicePixelRatio: 0 });
    expect(scale).toBeCloseTo(1, 5);
  });

  it('returns 1 for degenerate inputs instead of NaN or Infinity', () => {
    expect(
      computeRenderScale({ baseWidth: 0, baseHeight: 842, cssWidth: 100, devicePixelRatio: 1 }),
    ).toBe(1);
    expect(computeRenderScale({ ...a4, cssWidth: 0, devicePixelRatio: 1 })).toBe(1);
  });
});

describe('classifyPdfError', () => {
  it('classifies password, corrupt, and unknown failures', () => {
    expect(classifyPdfError({ name: 'PasswordException' })).toBe('password');
    expect(classifyPdfError({ name: 'InvalidPDFException' })).toBe('corrupt');
    expect(classifyPdfError({ name: 'FormatError' })).toBe('corrupt');
    expect(classifyPdfError({ name: 'SomethingElse' })).toBe('unknown');
    expect(classifyPdfError(new Error('plain'))).toBe('unknown');
    expect(classifyPdfError(null)).toBe('unknown');
    expect(classifyPdfError('string error')).toBe('unknown');
  });
});

describe('PageCache', () => {
  function cleanable(): { cleanup: ReturnType<typeof vi.fn> } {
    return { cleanup: vi.fn() };
  }

  it('rejects a non-positive capacity', () => {
    expect(() => new PageCache(0)).toThrow(RangeError);
    expect(() => new PageCache(1.5)).toThrow(RangeError);
  });

  it('evicts the least recently used entry and cleans it up', () => {
    const cache = new PageCache<ReturnType<typeof cleanable>>(2);
    const [p1, p2, p3] = [cleanable(), cleanable(), cleanable()];

    cache.set(1, p1);
    cache.set(2, p2);
    cache.set(3, p3); // evicts page 1

    expect(cache.size).toBe(2);
    expect(p1.cleanup).toHaveBeenCalledOnce();
    expect(p2.cleanup).not.toHaveBeenCalled();
    expect(cache.get(1)).toBeUndefined();
    expect(cache.get(3)).toBe(p3);
  });

  it('get() refreshes recency so hot pages survive eviction', () => {
    const cache = new PageCache<ReturnType<typeof cleanable>>(2);
    const [p1, p2, p3] = [cleanable(), cleanable(), cleanable()];

    cache.set(1, p1);
    cache.set(2, p2);
    cache.get(1); // page 1 is now most recent
    cache.set(3, p3); // should evict page 2, not page 1

    expect(p2.cleanup).toHaveBeenCalledOnce();
    expect(p1.cleanup).not.toHaveBeenCalled();
    expect(cache.get(1)).toBe(p1);
  });

  it('clear() cleans up every entry', () => {
    const cache = new PageCache<ReturnType<typeof cleanable>>(3);
    const pages = [cleanable(), cleanable(), cleanable()];
    pages.forEach((p, i) => cache.set(i + 1, p));

    cache.clear();

    expect(cache.size).toBe(0);
    for (const p of pages) {
      expect(p.cleanup).toHaveBeenCalledOnce();
    }
  });

  it('survives a cleanup() that throws (render in flight)', () => {
    const cache = new PageCache<{ cleanup(): void }>(1);
    cache.set(1, {
      cleanup() {
        throw new Error('renderer busy');
      },
    });
    expect(() => cache.set(2, { cleanup: vi.fn() })).not.toThrow();
    expect(cache.size).toBe(1);
  });
});
