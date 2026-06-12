/**
 * Autosave: bridges InkEngine events to persistence (PRD principle 4,
 * "Never lose a drawing"; F1.6 continuous autosave).
 *
 * Every committed stroke is enqueued for write the moment the engine emits
 * it; undo and clear mirror their events. Writes flow through a serialized
 * promise queue so they apply in event order (commit, undo, commit must
 * never interleave). On visibilitychange to hidden the in-progress stroke,
 * if any, is committed first: a child backgrounded mid-stroke keeps what
 * they drew.
 *
 * Sits outside the pointer-to-paint hot path entirely: the engine emits
 * synchronously after commit, and the actual IndexedDB work is async.
 */
import type { InkEngine, InkEvent } from '@/engine';
import { appendStrokeBatch, clearPageStrokes, deleteLatestStrokeBatch } from './queries';

/** The slice of Document that autosave needs; structural so tests can fake it. */
export type VisibilityTarget = Pick<
  Document,
  'addEventListener' | 'removeEventListener' | 'visibilityState'
>;

export type AutosaveOptions = {
  engine: InkEngine;
  activityId: string;
  /**
   * Surfaced for every failed write (e.g. QuotaExceededError) after the queue
   * has already moved on; one failure never blocks later saves. The parent
   * zone decides what to show.
   */
  onError?: (error: unknown) => void;
  /** Event target for visibility tracking; injectable for tests. */
  visibilityTarget?: VisibilityTarget;
};

export type AutosaveHandle = {
  /** Resolves when every write enqueued so far has been persisted. */
  flush: () => Promise<void>;
  /** Unsubscribe from the engine and visibility events, then flush. */
  dispose: () => Promise<void>;
};

/** Start mirroring an engine's committed state into the database. */
export function startAutosave(options: AutosaveOptions): AutosaveHandle {
  const { engine, activityId, onError } = options;
  const visibilityTarget = options.visibilityTarget ?? document;

  let queue: Promise<void> = Promise.resolve();

  const enqueue = (write: () => Promise<unknown>): void => {
    queue = queue
      .then(write)
      .then(() => undefined)
      .catch((error: unknown) => {
        // Keep the chain alive: a failed write must not block the next one.
        onError?.(error);
      });
  };

  const onInkEvent = (event: InkEvent): void => {
    switch (event.type) {
      case 'commit':
        enqueue(() => appendStrokeBatch(activityId, event.pageNumber, [event.mark]));
        break;
      case 'undo':
        enqueue(() => deleteLatestStrokeBatch(activityId, event.pageNumber));
        break;
      case 'clear':
        enqueue(() => clearPageStrokes(activityId, event.pageNumber));
        break;
      case 'load':
        // Loading replays already-persisted state; nothing to write.
        break;
    }
  };

  const onVisibilityChange = (): void => {
    if (visibilityTarget.visibilityState !== 'hidden') return;
    // App backgrounded mid-stroke: commit what the child drew. endStroke
    // emits 'commit' synchronously, which enqueues the write above.
    if (engine.getCurrentStroke()) {
      engine.endStroke();
    }
  };

  const unsubscribe = engine.onChange(onInkEvent);
  visibilityTarget.addEventListener('visibilitychange', onVisibilityChange);

  const flush = (): Promise<void> => queue;

  return {
    flush,
    dispose: async (): Promise<void> => {
      unsubscribe();
      visibilityTarget.removeEventListener('visibilitychange', onVisibilityChange);
      await flush();
    },
  };
}
