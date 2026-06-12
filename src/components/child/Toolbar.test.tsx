import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toolbar } from './Toolbar';
import { InkEngine } from '@/engine';
import { useActivityUiStore } from '@/store/activity';
import { BRUSH_SIZES, INK_PALETTE } from '@/constants';

describe('Toolbar', () => {
  let engine: InkEngine;

  beforeEach(() => {
    engine = new InkEngine();
    useActivityUiStore.setState({ tool: 'crayon', color: INK_PALETTE[0], sizeIndex: 1 });
  });

  it('syncs the displayed selection into the engine on mount (no tap needed)', () => {
    // Regression: engine kept its own default color until a swatch was tapped,
    // so the first scribble drew black while the tray showed red.
    useActivityUiStore.setState({ tool: 'crayon', color: INK_PALETTE[0], sizeIndex: 2 });
    render(<Toolbar engine={engine} />);

    expect(engine.getColor()).toBe(INK_PALETTE[0]);
    expect(engine.getTool()).toBe('crayon');
    expect(engine.getSize()).toBe(BRUSH_SIZES[2]);
  });

  it('mirrors tool selection into the engine', () => {
    render(<Toolbar engine={engine} />);

    fireEvent.click(screen.getByRole('button', { name: 'marker' }));
    expect(engine.getTool()).toBe('marker');

    fireEvent.click(screen.getByRole('button', { name: 'eraser' }));
    expect(engine.getTool()).toBe('eraser');
  });

  it('leaves the eraser when a color is picked (picking a color means draw)', () => {
    useActivityUiStore.setState({ tool: 'eraser', color: INK_PALETTE[0], sizeIndex: 1 });
    render(<Toolbar engine={engine} />);
    expect(engine.getTool()).toBe('eraser');

    fireEvent.click(screen.getByRole('button', { name: `color ${INK_PALETTE[3]}` }));

    expect(engine.getTool()).toBe('crayon');
    expect(engine.getColor()).toBe(INK_PALETTE[3]);
  });

  it('offers all four tools and the full 8-color palette (F1.4)', () => {
    render(<Toolbar engine={engine} />);

    for (const tool of ['crayon', 'marker', 'pencil', 'eraser']) {
      expect(screen.getByRole('button', { name: tool })).toBeInTheDocument();
    }
    const swatches = screen.getAllByRole('button', { name: /^color / });
    expect(swatches).toHaveLength(8);
  });

  it('mirrors color and size selection into the engine', () => {
    render(<Toolbar engine={engine} />);

    fireEvent.click(screen.getByRole('button', { name: `color ${INK_PALETTE[4]}` }));
    expect(engine.getColor()).toBe(INK_PALETTE[4]);

    fireEvent.click(screen.getByRole('button', { name: 'size 3' }));
    expect(engine.getSize()).toBe(BRUSH_SIZES[2]);
  });

  it('includes the green Done button (undo/redo live in the top bar)', () => {
    render(<Toolbar engine={engine} />);
    expect(screen.getByRole('button', { name: 'done' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'undo' })).toBeNull();
  });

  it('contains no visible text, only icons (child zone rule)', () => {
    const { container } = render(<Toolbar engine={engine} />);
    expect(container.textContent?.trim()).toBe('');
  });
});
