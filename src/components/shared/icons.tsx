/**
 * The SVG icon set. The child zone is icon-only (no text, no emoji), so these
 * shapes are the entire vocabulary a pre-reader gets: each one is a simple,
 * filled, real-world silhouette. All icons render from currentColor so the
 * tray can tint them, and scale via the size prop (default fits 56px targets).
 */
import type { JSX } from 'react';

type IconProps = {
  size?: number;
  className?: string;
};

function svgProps(size: number, className?: string): JSX.IntrinsicElements['svg'] {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true,
    focusable: false,
    ...(className ? { className } : {}),
  };
}

/** Crayon: blunt-tipped stick with a wrapper band. */
export function CrayonIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M15.6 3.2a2 2 0 0 1 2.8 0l2.4 2.4a2 2 0 0 1 0 2.8L19 10.2 13.8 5l1.8-1.8z" />
      <path
        d="M12.6 6.2 17.8 11.4 9.4 19.8a2 2 0 0 1-.9.5l-4.2 1.1a.8.8 0 0 1-1-1l1.1-4.2a2 2 0 0 1 .5-.9l7.7-7.7z"
        opacity="0.75"
      />
    </svg>
  );
}

/** Marker: chisel-tip pen body. */
export function MarkerIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M9 3h6a1 1 0 0 1 1 1v3H8V4a1 1 0 0 1 1-1z" />
      <path d="M8 8h8v8a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8z" opacity="0.75" />
      <path d="M10 18h4l-1 3h-2l-1-3z" />
    </svg>
  );
}

/** Pencil: classic hexagonal pencil with a sharp tip. */
export function PencilIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M14.06 4.94l2.12-2.12a1.5 1.5 0 0 1 2.12 0l2.88 2.88a1.5 1.5 0 0 1 0 2.12l-2.12 2.12-5-5z" />
      <path
        d="M12.94 6.06l5 5L8.5 20.5l-5.62 1.62a.6.6 0 0 1-.74-.74L3.5 15.5l9.44-9.44z"
        opacity="0.75"
      />
    </svg>
  );
}

/** Eraser: tilted block with a wiped streak underneath. */
export function EraserIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M9.5 17.5 4 12a2 2 0 0 1 0-2.8l5.2-5.2a2 2 0 0 1 2.8 0l6 6a2 2 0 0 1 0 2.8l-4.7 4.7H9.5z"
        opacity="0.85"
      />
      <path d="M4 20h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z" opacity="0.5" />
    </svg>
  );
}

/** Undo: a bold counterclockwise arrow. */
export function UndoIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M7.4 10.4 4 7l6-4v3.1c5 .3 9 4 9 8.4 0 4.7-4.3 8.5-9.7 8.5-2.5 0-4.8-.8-6.5-2.2l2-2.4c1.2 1 2.8 1.6 4.5 1.6 3.7 0 6.7-2.5 6.7-5.5 0-2.8-2.6-5.1-6-5.4V13l-2.6-2.6z" />
    </svg>
  );
}

/** Back: a big chevron pointing left. */
export function BackIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M14.7 3.3a1.6 1.6 0 0 1 0 2.3L8.3 12l6.4 6.4a1.6 1.6 0 1 1-2.3 2.3l-7.5-7.6a1.6 1.6 0 0 1 0-2.2l7.5-7.6a1.6 1.6 0 0 1 2.3 0z" />
    </svg>
  );
}

/** Forward: a big chevron pointing right. */
export function ForwardIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M9.3 3.3a1.6 1.6 0 0 0 0 2.3l6.4 6.4-6.4 6.4a1.6 1.6 0 1 0 2.3 2.3l7.5-7.6a1.6 1.6 0 0 0 0-2.2l-7.5-7.6a1.6 1.6 0 0 0-2.3 0z" />
    </svg>
  );
}

/** Plus: for the parent-facing add/import affordance. */
export function PlusIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 4a1.6 1.6 0 0 1 1.6 1.6v4.8h4.8a1.6 1.6 0 0 1 0 3.2h-4.8v4.8a1.6 1.6 0 0 1-3.2 0v-4.8H5.6a1.6 1.6 0 0 1 0-3.2h4.8V5.6A1.6 1.6 0 0 1 12 4z" />
    </svg>
  );
}

/** Home: a house silhouette for the return-to-shelf action. */
export function HomeIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M11.3 3.3a1 1 0 0 1 1.4 0l8 7.6A1 1 0 0 1 20 12.7V20a2 2 0 0 1-2 2h-3v-6h-4v6H6a2 2 0 0 1-2-2v-7.3a1 1 0 0 1 .3-.8l7-6.6z" />
    </svg>
  );
}

/** A page/worksheet silhouette for empty covers. */
export function PageIcon({ size = 28, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" opacity="0.6" />
      <path d="M14 2v4h4l-4-4z" />
    </svg>
  );
}
