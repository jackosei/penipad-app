/**
 * Parental gate, Phase 1 form: press and hold for 3 seconds, then answer a
 * simple sum. The hold defeats random child taps; the sum confirms a grown-up
 * (a pre-reader can neither read the prompt nor add). Two light barriers, a few
 * seconds for a parent.
 *
 * A UX barrier, not a security boundary (real security arrives with auth + RLS
 * in Phase 2). Copy is parent-facing by definition, so plain language is fine.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { PARENT_GATE_HOLD_MS } from '@/constants';
import { makeMathChallenge, type MathChallenge } from '@/utils/math-challenge';

export type ParentGateProps = {
  /** Parent-facing description of what unlocking will do. */
  label: string;
  onUnlock: () => void;
  onDismiss: () => void;
};

type Phase = 'hold' | 'maths';

export function ParentGate({ label, onUnlock, onDismiss }: ParentGateProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>('hold');
  const [progress, setProgress] = useState(0);
  const [challenge, setChallenge] = useState<MathChallenge>(() => makeMathChallenge());
  const [wrong, setWrong] = useState(false);

  const holdStart = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const advanced = useRef(false);

  const stopTicking = useCallback((): void => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const tick = useCallback((): void => {
    if (holdStart.current === null) return;
    const ratio = Math.min((performance.now() - holdStart.current) / PARENT_GATE_HOLD_MS, 1);
    setProgress(ratio);
    if (ratio >= 1) {
      if (!advanced.current) {
        advanced.current = true;
        setPhase('maths');
      }
      return;
    }
    rafId.current = requestAnimationFrame(tick);
  }, []);

  const beginHold = useCallback((): void => {
    if (advanced.current) return;
    holdStart.current = performance.now();
    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const endHold = useCallback((): void => {
    holdStart.current = null;
    stopTicking();
    setProgress(0);
  }, [stopTicking]);

  useEffect(() => stopTicking, [stopTicking]);

  const answer = (value: number): void => {
    if (value === challenge.answer) {
      onUnlock();
    } else {
      setWrong(true);
      setChallenge(makeMathChallenge());
    }
  };

  return (
    <div className="gate-overlay" role="dialog" aria-label="Grown-ups only">
      <div className="gate-card">
        <p className="gate-card__label">{label}</p>

        {phase === 'hold' ? (
          <>
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
          </>
        ) : (
          <>
            <p className="gate-card__hint" aria-live="polite">
              {wrong ? 'Not quite. Try this one.' : 'Tap the answer to continue.'}
            </p>
            <p className="gate-card__sum">
              {challenge.a} + {challenge.b} = ?
            </p>
            <div className="gate-card__options">
              {challenge.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="gate-card__option"
                  onClick={() => answer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        <button type="button" className="gate-card__dismiss" onClick={onDismiss}>
          Go back
        </button>
      </div>
    </div>
  );
}
