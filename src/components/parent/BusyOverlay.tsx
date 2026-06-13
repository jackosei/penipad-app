/**
 * A blocking progress overlay for slow parent actions (e.g. exporting a PDF,
 * which rasterizes every page). It covers the screen so the action cannot be
 * triggered twice while it runs, and shows a plain-language message.
 */
import type { JSX } from 'react';

export function BusyOverlay({ message }: { message: string }): JSX.Element {
  return (
    <div className="busy-overlay" role="alert" aria-busy="true">
      <div className="busy-overlay__card">
        <div className="spinner" aria-hidden />
        <p className="busy-overlay__text">{message}</p>
      </div>
    </div>
  );
}
