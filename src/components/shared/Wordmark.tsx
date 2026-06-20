/**
 * The Peni Pad wordmark: a crayon mark in an accent tile beside the name.
 * Used in the shelf top bar. The crayon glyph is bespoke (a real crayon shape),
 * not a Lucide icon, since it is the brand mark.
 */
import type { JSX } from 'react';

export function Wordmark(): JSX.Element {
  return (
    <div className="wordmark">
      <span className="wordmark__tile" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="6" y="1" width="6" height="12" rx="2" fill="white" />
          <polygon points="6,13 12,13 9,17" fill="rgba(255,255,255,.7)" />
          <rect x="6" y="1" width="6" height="3" rx="1.5" fill="rgba(255,255,255,.5)" />
        </svg>
      </span>
      <span className="wordmark__text">
        Peni<span>Pad</span>
      </span>
    </div>
  );
}
