/**
 * Color picker: a palette button in the tray that opens a popover of crayons
 * above the toolbar. Collapsing the 8 colors into one trigger keeps the tray a
 * single row (fixes the tablet wrapping). The trigger wears the current color
 * as a ring so the child always sees their active color; the popover is
 * dismissed by tapping a crayon or the backdrop. Icon-only, 56px+ targets.
 */
import { useState, type CSSProperties, type JSX } from 'react';
import { Palette } from 'lucide-react';
import { INK_PALETTE } from '@/constants';

export type ColorPickerProps = {
  color: string;
  onPick: (color: string) => void;
};

export function ColorPicker({ color, onPick }: ColorPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);

  const choose = (next: string): void => {
    onPick(next);
    setOpen(false);
  };

  return (
    <div className="color-picker">
      <button
        type="button"
        className="color-trigger"
        style={{ '--current': color } as CSSProperties}
        aria-label="colors"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Palette className="color-trigger__icon" size={28} aria-hidden />
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
                onClick={() => choose(swatch)}
              >
                <span className="crayon__stick" aria-hidden>
                  <span className="crayon__tip" />
                  <span className="crayon__body" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
