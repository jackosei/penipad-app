/**
 * The child tray: tools, crayon colors, sizes, and the big green Done button.
 * Icon-only (Lucide glyphs), no text, every target at least 56px (CLAUDE.md
 * child zone rules).
 *
 * Data flow: the activity UI store holds the displayed selection; a single
 * effect mirrors it into the InkEngine, which is authoritative for stroke
 * capture. Nothing here is in the pointer-to-paint path. Undo/redo live in the
 * top bar (HistoryControls), not the tray.
 */
import { useEffect, type CSSProperties, type JSX } from 'react';
import { Brush, Eraser, Highlighter, Pencil, type LucideIcon } from 'lucide-react';
import type { InkEngine } from '@/engine';
import type { ToolId } from '@/types/ink';
import { BRUSH_SIZES, INK_PALETTE } from '@/constants';
import { brushSizeFor, useActivityUiStore } from '@/store/activity';
import { DoneButton } from './DoneButton';

const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  crayon: Brush,
  marker: Highlighter,
  pencil: Pencil,
  eraser: Eraser,
};

const TOOL_ORDER: ToolId[] = ['crayon', 'marker', 'pencil', 'eraser'];
const TOOL_GLYPH_SIZE = 28;

export type ToolbarProps = {
  engine: InkEngine;
};

export function Toolbar({ engine }: ToolbarProps): JSX.Element {
  const { tool, color, sizeIndex, setTool, setColor, setSizeIndex } = useActivityUiStore();

  // Single source of truth: store selection flows into the engine. Runs on
  // mount (initial selection) and on every change.
  useEffect(() => {
    engine.setTool(tool);
    engine.setColor(color);
    engine.setSize(brushSizeFor(sizeIndex));
  }, [engine, tool, color, sizeIndex]);

  const pickColor = (next: string): void => {
    setColor(next);
    // Picking a color means "I want to draw": leave the eraser behind.
    if (tool === 'eraser') setTool('crayon');
  };

  return (
    <div className="tray" data-testid="toolbar">
      {/* Row 1: the full crayon color strip gets its own row so it never
          competes for width with the tools (fixes tablet wrapping). */}
      <div className="tray__row tray__row--colors" role="group" aria-label="Colors">
        {INK_PALETTE.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={`crayon${color === swatch ? ' crayon--active' : ''}`}
            style={{ '--crayon': swatch } as CSSProperties}
            aria-label={`color ${swatch}`}
            aria-pressed={color === swatch}
            onClick={() => pickColor(swatch)}
          >
            <span className="crayon__stick" aria-hidden>
              <span className="crayon__tip" />
              <span className="crayon__body" />
            </span>
          </button>
        ))}
      </div>

      {/* Row 2: tools, sizes, and the Done button. */}
      <div className="tray__row">
        <div className="tray__group" role="group" aria-label="Tools">
          {TOOL_ORDER.map((id) => {
            const Icon = TOOL_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                className={`tool-button${tool === id ? ' tool-button--active' : ''}`}
                aria-label={id}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
              >
                <Icon size={TOOL_GLYPH_SIZE} aria-hidden />
              </button>
            );
          })}
        </div>

        <span className="tray__divider" aria-hidden />

        <div className="tray__group" role="group" aria-label="Sizes">
          {BRUSH_SIZES.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`size-button${sizeIndex === index ? ' size-button--active' : ''}`}
              aria-label={`size ${index + 1}`}
              aria-pressed={sizeIndex === index}
              onClick={() => setSizeIndex(index as 0 | 1 | 2)}
            >
              <span className="size-button__dot" data-size={index} aria-hidden />
            </button>
          ))}
        </div>

        <span className="tray__divider" aria-hidden />

        <DoneButton engine={engine} />
      </div>
    </div>
  );
}
