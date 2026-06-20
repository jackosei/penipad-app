/**
 * The completion moment (F1.12, peni-pad-screens "Completion" screen). After
 * the child confirms "Done", this celebratory card rises over the dimmed page
 * with confetti: a big star, the sticker they just earned, and a choice of
 * what next. Tapping the backdrop dismisses it so the child can keep drawing
 * on the same page (completion is a celebration, not a lock).
 */
import type { JSX } from 'react';
import type { StickerId } from '@/types/ink';
import { StickerArt } from '@/components/shared/stickers';
import { Confetti } from './Confetti';

export type CompletionCardProps = {
  sticker: StickerId;
  /** True when there is a next page to move to. */
  hasNextPage: boolean;
  onNextPage: () => void;
  onGoHome: () => void;
  onDismiss: () => void;
};

function BigStar(): JSX.Element {
  return (
    <svg className="completion__star" width="76" height="76" viewBox="0 0 72 72" aria-hidden>
      <polygon
        points="36,6 43,26 65,26 48,40 54,61 36,48 18,61 24,40 7,26 29,26"
        fill="#FFC92A"
        stroke="#D4A800"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CompletionCard({
  sticker,
  hasNextPage,
  onNextPage,
  onGoHome,
  onDismiss,
}: CompletionCardProps): JSX.Element {
  return (
    <div className="completion" role="dialog" aria-modal="true" aria-label="Page finished">
      <Confetti />
      <div className="completion__backdrop" aria-hidden onClick={onDismiss} />
      <div className="completion__card">
        <BigStar />
        <h2 className="completion__heading">Amazing work!</h2>
        <p className="completion__subtext">You finished this page. Here is your sticker.</p>

        <div className="completion__sticker" aria-hidden>
          <StickerArt id={sticker} className="completion__sticker-art" />
        </div>

        <div className="completion__buttons">
          <button type="button" className="completion__btn" onClick={onGoHome}>
            Go home
          </button>
          {hasNextPage && (
            <button
              type="button"
              className="completion__btn completion__btn--primary"
              onClick={onNextPage}
            >
              Next page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
