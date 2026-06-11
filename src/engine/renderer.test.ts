import { describe, expect, it } from 'vitest';
import { renderStroke, renderStrokes } from './renderer';
import { RecordingTarget } from '@/test/render-target';
import { REFERENCE_PAGE_SIZE } from '@/test/ink-fixtures';
import type { Stroke } from '@/types/ink';

function stroke(partial: Partial<Stroke> = {}): Stroke {
  return {
    tool: 'crayon',
    color: '#ff0000',
    size: 0.02,
    points: [
      { x: 0.2, y: 0.2, pressure: 0.5 },
      { x: 0.5, y: 0.6, pressure: 0.6 },
      { x: 0.8, y: 0.3, pressure: 0.4 },
    ],
    ...partial,
  };
}

describe('renderStroke', () => {
  it('fills the crayon twice with source-over compositing and the stroke color', () => {
    const ctx = new RecordingTarget();
    renderStroke(ctx, stroke({ tool: 'crayon', color: '#123456' }), REFERENCE_PAGE_SIZE);

    expect(ctx.fills).toHaveLength(2);
    for (const fill of ctx.fills) {
      expect(fill.composite).toBe('source-over');
      expect(fill.fillStyle).toBe('#123456');
    }
  });

  it('fills the marker once', () => {
    const ctx = new RecordingTarget();
    renderStroke(ctx, stroke({ tool: 'marker' }), REFERENCE_PAGE_SIZE);
    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0]?.composite).toBe('source-over');
  });

  it('fills the pencil once with the stroke color', () => {
    const ctx = new RecordingTarget();
    renderStroke(ctx, stroke({ tool: 'pencil', color: '#445566' }), REFERENCE_PAGE_SIZE);
    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0]?.composite).toBe('source-over');
    expect(ctx.fills[0]?.fillStyle).toBe('#445566');
  });

  it('erases with destination-out regardless of the stroke color', () => {
    const ctx = new RecordingTarget();
    renderStroke(ctx, stroke({ tool: 'eraser', color: '#00ff00' }), REFERENCE_PAGE_SIZE);

    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0]?.composite).toBe('destination-out');
    // The eraser must not paint the stroke color onto the layer.
    expect(ctx.fills[0]?.fillStyle).not.toBe('#00ff00');
  });

  it('draws a single-point tap (a dot must appear)', () => {
    const ctx = new RecordingTarget();
    renderStroke(ctx, stroke({ points: [{ x: 0.5, y: 0.5, pressure: 0.5 }] }), REFERENCE_PAGE_SIZE);
    expect(ctx.fills.length).toBeGreaterThan(0);
    expect(ctx.beginPathCount).toBeGreaterThan(0);
  });

  it('renders nothing for an empty stroke', () => {
    const ctx = new RecordingTarget();
    renderStroke(ctx, stroke({ points: [] }), REFERENCE_PAGE_SIZE);
    expect(ctx.fills).toHaveLength(0);
  });
});

describe('renderStrokes', () => {
  it('replays strokes in order (each stroke produces its passes)', () => {
    const ctx = new RecordingTarget();
    renderStrokes(
      ctx,
      [stroke({ tool: 'marker' }), stroke({ tool: 'eraser' })],
      REFERENCE_PAGE_SIZE,
    );
    // marker (1 pass) + eraser (1 pass)
    expect(ctx.fills).toHaveLength(2);
    expect(ctx.fills[0]?.composite).toBe('source-over');
    expect(ctx.fills[1]?.composite).toBe('destination-out');
  });
});
