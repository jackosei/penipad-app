/**
 * Parental gate, Phase 1 form: press and hold for 3 seconds.
 *
 * A UX barrier, not a security boundary (real security arrives with auth +
 * RLS in Phase 2). The hold defeats random taps from a child; Step 6 layers
 * a maths challenge on top of this primitive for the full gate.
 *
 * Copy is parent-facing by definition (the child cannot pass the gate), so
 * plain-language text is allowed here.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { PARENT_GATE_HOLD_MS } from '@/constants';

export type HoldGateProps = {
  /** Parent-facing description of what unlocking will do. */
  label: string;
  onUnlock: () => void;
  onDismiss: () => void;
};

export function HoldGate({ label, onUnlock, onDismiss }: HoldGateProps): JSX.Element {
  const [progress, setProgress] = useState(0);
  const holdStart = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const unlocked = useRef(false);

  const stopTicking = useCallback((): void => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const tick = useCallback((): void => {
    if (holdStart.current === null) return;
    const elapsed = performance.now() - holdStart.current;
    const ratio = Math.min(elapsed / PARENT_GATE_HOLD_MS, 1);
    setProgress(ratio);
    if (ratio >= 1) {
      if (!unlocked.current) {
        unlocked.current = true;
        onUnlock();
      }
      return;
    }
    rafId.current = requestAnimationFrame(tick);
  }, [onUnlock]);

  const beginHold = useCallback((): void => {
    if (unlocked.current) return;
    holdStart.current = performance.now();
    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const endHold = useCallback((): void => {
    holdStart.current = null;
    stopTicking();
    setProgress(0);
  }, [stopTicking]);

  useEffect(() => stopTicking, [stopTicking]);

  return (
    <div className="gate-overlay" role="dialog" aria-label="Grown-ups only">
      <div className="gate-card">
        <p className="gate-card__label">{label}</p>
        <p className="gate-card__hint">Press and hold the button for 3 seconds.</p>
        <button
          type="button"
          className="gate-card__hold"
          onPointerDown={beginHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
        >
          <span
            className="gate-card__hold-fill"
            style={{ transform: `scaleX(${progress})` }}
            aria-hidden
          />
          <span className="gate-card__hold-text">Hold to continue</span>
        </button>
        <button type="button" className="gate-card__dismiss" onClick={onDismiss}>
          Go back
        </button>
      </div>
    </div>
  );
}
