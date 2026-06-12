/**
 * First-run / empty-shelf welcome, adapted from the mockup. This is setup
 * state (the only action is the parent-gated import), so a friendly title and
 * one line of plain copy are appropriate here; the drawing surface itself
 * stays icon-only. The CTA is provided by the caller (the gated ImportControl).
 */
import type { JSX, ReactNode } from 'react';

export function Welcome({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="welcome">
      <h1 className="welcome__title">
        Let&rsquo;s scribble!
        <svg
          className="welcome__underline"
          viewBox="0 0 200 20"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M4 14 Q 30 4 60 12 T 120 10 T 196 12"
            fill="none"
            stroke="#FFC92A"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </h1>
      <p className="welcome__subtitle">
        Open any worksheet PDF and color the answers with your finger, just like a real crayon.
      </p>
      <div className="welcome__cta">{children}</div>
    </div>
  );
}
