import { beforeEach, describe, expect, it } from 'vitest';
import { InkEngine } from './ink';
import { InkSurface } from './surface';
import { FakeSurfaceCanvas } from '@/test/render-target';
import { TOOL_CONFIGS } from './tools';
import type { Viewport } from './geometry';

const view: Viewport = { originX: 0, originY: 0, width: 1000, height: 1000 };

function drawStroke(engine: InkEngine, x = 100): void {
  engine.beginStroke({ x, y: 100, pressure: 0.5 }, view);
  engine.appendSamples([{ x: x + 50, y: 160, pressure: 0.6 }], view);
  engine.endStroke();
}

describe('InkSurface', () => {
  let engine: InkEngine;
  let committed: FakeSurfaceCanvas;
  let live: FakeSurfaceCanvas;
  let frames: Array<() => void>;
  let surface: InkSurface;

  const runFrames = (): void => {
    while (frames.length > 0) frames.shift()?.();
  };

  beforeEach(() => {
    engine = new InkEngine();
    committed = new FakeSurfaceCanvas();
    live = new FakeSurfaceCanvas();
    frames = [];
    surface = new InkSurface({
      engine,
      committedCanvas: committed,
      liveCanvas: live,
      scheduler: (cb) => frames.push(cb),
    });
    surface.setPageSize(1000, 1000);
    runFrames();
    committed.ctx.reset();
    live.ctx.reset();
  });

  it('sizes both layer backing stores', () => {
    surface.setPageSize(800, 600);
    expect(committed.width).toBe(800);
    expect(committed.height).toBe(600);
    expect(live.width).toBe(800);
    expect(live.height).toBe(600);
  });

  it('paints a committed stroke incrementally (no history replay)', () => {
    drawStroke(engine);
    // One crayon stroke = exactly its passes; a replay would also clearRect.
    expect(committed.ctx.fills).toHaveLength(TOOL_CONFIGS.crayon.passes.length);
    expect(committed.ctx.clearRectCount).toBe(0);
  });

  it('clears the live layer after a commit lands', () => {
    drawStroke(engine);
    runFrames();
    expect(live.ctx.clearRectCount).toBeGreaterThan(0);
    expect(live.ctx.fills).toHaveLength(0); // no in-progress stroke remains
  });

  it('replays the committed layer on undo', () => {
    drawStroke(engine, 100);
    drawStroke(engine, 300);
    committed.ctx.reset();

    engine.undo();

    expect(committed.ctx.clearRectCount).toBe(1);
    // One remaining stroke replayed.
    expect(committed.ctx.fills).toHaveLength(TOOL_CONFIGS.crayon.passes.length);
  });

  it('paints the in-progress stroke on the live layer once per frame', () => {
    engine.beginStroke({ x: 100, y: 100, pressure: 0.5 }, view);
    surface.scheduleLiveFrame();
    surface.scheduleLiveFrame();
    surface.scheduleLiveFrame();
    expect(frames).toHaveLength(1); // bursts collapse into one queued frame

    runFrames();
    expect(live.ctx.fills.length).toBeGreaterThan(0);
  });

  it('ignores events for a page that is not active', () => {
    engine.setActivePage(2);
    committed.ctx.reset();
    engine.clearPage(7); // event for another page
    expect(committed.ctx.clearRectCount).toBe(0);
  });

  it('stops reacting after dispose', () => {
    surface.dispose();
    committed.ctx.reset();
    drawStroke(engine);
    expect(committed.ctx.fills).toHaveLength(0);
  });
});
