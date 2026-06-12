/**
 * Pointer input pipeline: DOM pointer events to InkEngine samples.
 *
 * Hot-path code, zero React. Coalesced events are unpacked so fast scribbles
 * keep every sample the hardware captured; the caller repaints the live layer
 * once per animation frame via `onFrame`.
 *
 * Touch policy (settled device strategy): one finger inks. A second pointer
 * landing mid-stroke cancels the in-progress stroke, because the fragment was
 * almost certainly a palm or the start of a navigation gesture, and no new
 * stroke begins until every pointer lifts. `pointercancel` (the browser took
 * the gesture) commits what was drawn rather than discarding it.
 */
import type { InkEngine, PointerSample } from './ink';
import type { Viewport } from './geometry';

export type InkInputOptions = {
  engine: InkEngine;
  /** The element receiving pointer events (the live ink canvas). */
  target: HTMLElement;
  /** Current page viewport in client coordinates; queried per event. */
  getViewport: () => Viewport;
  /** Called when the live layer needs a repaint (at most once per frame). */
  onFrame: () => void;
};

function toSample(event: PointerEvent): PointerSample {
  return { x: event.clientX, y: event.clientY, pressure: event.pressure };
}

function coalesced(event: PointerEvent): PointerSample[] {
  if (typeof event.getCoalescedEvents === 'function') {
    const events = event.getCoalescedEvents();
    if (events.length > 0) return events.map(toSample);
  }
  return [toSample(event)];
}

/**
 * Attach ink input handling to an element. Returns a detach function.
 * The element should have `touch-action: none` so the browser never
 * claims single-finger gestures.
 */
export function attachInkInput(options: InkInputOptions): () => void {
  const { engine, target, getViewport, onFrame } = options;

  /** Pointer currently inking, or null. */
  let activePointerId: number | null = null;
  /** Pointers currently down on the surface (for the one-finger policy). */
  const downPointers = new Set<number>();

  const onPointerDown = (event: PointerEvent): void => {
    downPointers.add(event.pointerId);

    if (activePointerId !== null) {
      // Second pointer mid-stroke: palm or navigation intent. Drop the
      // in-progress fragment and ink nothing until all pointers lift.
      engine.cancelStroke();
      activePointerId = null;
      onFrame();
      return;
    }
    if (downPointers.size > 1) return; // mid-gesture; do not start strokes

    activePointerId = event.pointerId;
    target.setPointerCapture(event.pointerId);
    engine.beginStroke(toSample(event), getViewport());
    onFrame();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== activePointerId) return;
    if (engine.appendSamples(coalesced(event), getViewport())) {
      onFrame();
    }
  };

  const finishStroke = (event: PointerEvent): void => {
    downPointers.delete(event.pointerId);
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    // Commit on both up and cancel: whatever the child drew stays drawn.
    engine.endStroke();
    onFrame();
  };

  const onLostCapture = (event: PointerEvent): void => {
    // Capture loss without an up/cancel (rare): commit rather than lose ink.
    if (event.pointerId === activePointerId) {
      activePointerId = null;
      engine.endStroke();
      onFrame();
    }
    downPointers.delete(event.pointerId);
  };

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', finishStroke);
  target.addEventListener('pointercancel', finishStroke);
  target.addEventListener('lostpointercapture', onLostCapture);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', finishStroke);
    target.removeEventListener('pointercancel', finishStroke);
    target.removeEventListener('lostpointercapture', onLostCapture);
    engine.cancelStroke();
  };
}
