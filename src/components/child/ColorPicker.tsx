/**
 * Color picker: the tray trigger IS a little crayon wearing the current ink
 * color, so a pre-reader reads it literally ("that is my crayon; tapping it
 * opens the crayon box"). The popover is one horizontal row of crayons,
 * centered on the screen above the tray, dismissed by tapping outside;
 * picking a crayon keeps it open so the lift animation reads. Icon-only,
 * 56px+ targets.
 */
import { useState, type CSSProperties, type JSX } from 'react';
import { INK_PALETTE } from '@/constants';

export type ColorPickerProps = {
  color: string;
  onPick: (color: string) => void;
};

function CrayonStick(): JSX.Element {
  return (
    <span className="crayon__stick" aria-hidden>
      <span className="crayon__tip" />
      <span className="crayon__body" />
    </span>
  );
}

export function ColorPicker({ color, onPick }: ColorPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="color-trigger"
        style={{ '--crayon': color } as CSSProperties}
        aria-label="colors"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <CrayonStick />
      </button>

      {open && (
        <>
          <div className="popover-backdrop" aria-hidden onClick={() => setOpen(false)} />
          <div className="color-popover" role="group" aria-label="Colors">
            {INK_PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`crayon${color === swatch ? ' crayon--active' : ''}`}
                style={{ '--crayon': swatch } as CSSProperties}
                aria-label={`color ${swatch}`}
                aria-pressed={color === swatch}
                onClick={() => onPick(swatch)}
              >
                <CrayonStick />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
