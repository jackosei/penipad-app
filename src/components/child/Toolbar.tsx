/**
 * The child tray: tools, colors, sizes, undo. Icon-only, no text anywhere,
 * every target at least 56px (CLAUDE.md child zone rules). Selections live
 * in the activity UI store and are mirrored into the engine immediately;
 * nothing here is in the pointer-to-paint path.
 */
import type { JSX } from 'react';
import type { InkEngine } from '@/engine';
import type { ToolId } from '@/types/ink';
import { BRUSH_SIZES, INK_PALETTE } from '@/constants';
import { brushSizeFor, useActivityUiStore } from '@/store/activity';
import {
  CrayonIcon,
  EraserIcon,
  MarkerIcon,
  PencilIcon,
  UndoIcon,
} from '@/components/shared/icons';

const TOOL_ICONS: Record<ToolId, (props: { size?: number }) => JSX.Element> = {
  crayon: CrayonIcon,
  marker: MarkerIcon,
  pencil: PencilIcon,
  eraser: EraserIcon,
};

const TOOL_ORDER: ToolId[] = ['crayon', 'marker', 'pencil', 'eraser'];

export type ToolbarProps = {
  engine: InkEngine;
};

export function Toolbar({ engine }: ToolbarProps): JSX.Element {
  const { tool, color, sizeIndex, setTool, setColor, setSizeIndex } = useActivityUiStore();

  const pickTool = (next: ToolId): void => {
    setTool(next);
    engine.setTool(next);
  };

  const pickColor = (next: string): void => {
    setColor(next);
    engine.setColor(next);
  };

  const pickSize = (index: 0 | 1 | 2): void => {
    setSizeIndex(index);
    engine.setSize(brushSizeFor(index));
  };

  return (
    <div className="tray" data-testid="toolbar">
      <div className="tray__group" role="group" aria-label="Tools">
        {TOOL_ORDER.map((id) => {
          const Icon = TOOL_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              className={`tray__button${tool === id ? ' tray__button--active' : ''}`}
              aria-label={id}
              aria-pressed={tool === id}
              onClick={() => pickTool(id)}
            >
              <Icon />
            </button>
          );
        })}
      </div>

      <div className="tray__group" role="group" aria-label="Colors">
        {INK_PALETTE.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={`tray__swatch${color === swatch ? ' tray__swatch--active' : ''}`}
            style={{ backgroundColor: swatch }}
            aria-label={`color ${swatch}`}
            aria-pressed={color === swatch}
            onClick={() => pickColor(swatch)}
          />
        ))}
      </div>

      <div className="tray__group" role="group" aria-label="Sizes">
        {BRUSH_SIZES.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`tray__button${sizeIndex === index ? ' tray__button--active' : ''}`}
            aria-label={`size ${index + 1}`}
            aria-pressed={sizeIndex === index}
            onClick={() => pickSize(index as 0 | 1 | 2)}
          >
            <span className="tray__size-dot" data-size={index} aria-hidden />
          </button>
        ))}
      </div>

      <div className="tray__group">
        <button
          type="button"
          className="tray__button"
          aria-label="undo"
          onClick={() => engine.undo()}
        >
          <UndoIcon />
        </button>
      </div>
    </div>
  );
}
