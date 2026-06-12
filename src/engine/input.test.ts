import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InkEngine } from './ink';
import { attachInkInput } from './input';
import type { Viewport } from './geometry';

const view: Viewport = { originX: 0, originY: 0, width: 1000, height: 1000 };

type FakePointerInit = {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  pressure?: number;
  coalesced?: Array<{ clientX: number; clientY: number; pressure?: number }>;
};

/** jsdom lacks PointerEvent; build a plain Event carrying the same fields. */
function pointerEvent(type: string, init: FakePointerInit = {}): Event {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, {
    pointerId: init.pointerId ?? 1,
    clientX: init.clientX ?? 100,
    clientY: init.clientY ?? 100,
    pressure: init.pressure ?? 0.5,
    ...(init.coalesced
      ? {
          getCoalescedEvents: () =>
            init.coalesced?.map((c) => ({
              clientX: c.clientX,
              clientY: c.clientY,
              pressure: c.pressure ?? 0.5,
            })) ?? [],
        }
      : {}),
  });
  return event;
}

describe('attachInkInput', () => {
  let engine: InkEngine;
  let target: HTMLElement;
  let onFrame: ReturnType<typeof vi.fn>;
  let setPointerCapture: ReturnType<typeof vi.fn>;
  let detach: () => void;

  beforeEach(() => {
    engine = new InkEngine();
    target = document.createElement('div');
    // jsdom does not implement pointer capture.
    setPointerCapture = vi.fn();
    target.setPointerCapture = setPointerCapture;
    target.releasePointerCapture = vi.fn();
    onFrame = vi.fn();
    detach = attachInkInput({ engine, target, getViewport: () => view, onFrame });
  });

  it('captures a full down-move-up stroke', () => {
    target.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, clientY: 100 }));
    expect(engine.getCurrentStroke()).not.toBeNull();
    expect(setPointerCapture).toHaveBeenCalledWith(1);

    target.dispatchEvent(pointerEvent('pointermove', { clientX: 200, clientY: 220 }));
    target.dispatchEvent(pointerEvent('pointerup', { clientX: 200, clientY: 220 }));

    expect(engine.getStrokeCount()).toBe(1);
    const stroke = engine.getPageStrokes()[0];
    expect(stroke?.points[0]).toMatchObject({ x: 0.1, y: 0.1 });
    expect(stroke?.points[1]).toMatchObject({ x: 0.2, y: 0.22 });
    expect(onFrame).toHaveBeenCalled();
  });

  it('unpacks coalesced events so fast scribbles keep every sample', () => {
    target.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }));
    target.dispatchEvent(
      pointerEvent('pointermove', {
        coalesced: [
          { clientX: 100, clientY: 100 },
          { clientX: 120, clientY: 120 },
          { clientX: 140, clientY: 140 },
        ],
      }),
    );
    target.dispatchEvent(pointerEvent('pointerup'));

    expect(engine.getPageStrokes()[0]?.points).toHaveLength(4); // down + 3 coalesced
  });

  it('cancels the stroke when a second pointer lands (palm policy)', () => {
    target.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    target.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 150 }));
    target.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2 }));

    expect(engine.getCurrentStroke()).toBeNull();
    expect(engine.getStrokeCount()).toBe(0);

    // No new stroke can start while pointers are still down.
    target.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 300 }));
    expect(engine.getCurrentStroke()).toBeNull();

    // After both lift, inking works again.
    target.dispatchEvent(pointerEvent('pointerup', { pointerId: 1 }));
    target.dispatchEvent(pointerEvent('pointerup', { pointerId: 2 }));
    target.dispatchEvent(pointerEvent('pointerdown', { pointerId: 3 }));
    expect(engine.getCurrentStroke()).not.toBeNull();
  });

  it('ignores moves from a pointer that is not inking', () => {
    target.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 100 }));
    target.dispatchEvent(pointerEvent('pointermove', { pointerId: 9, clientX: 900 }));

    expect(engine.getCurrentStroke()?.points).toHaveLength(1);
  });

  it('commits drawn ink on pointercancel instead of discarding it', () => {
    target.dispatchEvent(pointerEvent('pointerdown'));
    target.dispatchEvent(pointerEvent('pointermove', { clientX: 300, clientY: 300 }));
    target.dispatchEvent(pointerEvent('pointercancel'));

    expect(engine.getStrokeCount()).toBe(1);
  });

  it('stops handling events after detach', () => {
    detach();
    target.dispatchEvent(pointerEvent('pointerdown'));
    expect(engine.getCurrentStroke()).toBeNull();
  });
});
