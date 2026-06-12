import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DoneButton } from './DoneButton';
import { StickerLayer } from './StickerLayer';
import { InkEngine } from '@/engine';

describe('DoneButton (F1.12)', () => {
  let engine: InkEngine;

  beforeEach(() => {
    engine = new InkEngine();
  });

  /** Tap Done, then confirm via the icon-only yes button. */
  function tapDoneAndConfirm(): void {
    fireEvent.click(screen.getByRole('button', { name: 'done' }));
    fireEvent.click(screen.getByRole('button', { name: 'yes' }));
  }

  it('asks first, then places a sticker on the active page', () => {
    render(<DoneButton engine={engine} />);
    fireEvent.click(screen.getByRole('button', { name: 'done' }));
    // Nothing happens until the child confirms.
    expect(engine.getPageStickers()).toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'yes' }));
    expect(engine.getPageStickers()).toHaveLength(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancelling the confirm places nothing', () => {
    render(<DoneButton engine={engine} />);
    fireEvent.click(screen.getByRole('button', { name: 'done' }));
    fireEvent.click(screen.getByRole('button', { name: 'no' }));

    expect(engine.getPageStickers()).toHaveLength(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is bounded: repeated confirms never spawn more than one sticker per page', () => {
    render(<DoneButton engine={engine} />);

    tapDoneAndConfirm();
    tapDoneAndConfirm();
    tapDoneAndConfirm();

    expect(engine.getPageStickers()).toHaveLength(1);
  });

  it('is icon-only (no text label in the child zone)', () => {
    const { container } = render(<DoneButton engine={engine} />);
    expect(container.querySelector('button')?.textContent?.trim()).toBe('');
  });
});

describe('StickerLayer', () => {
  it('renders one node per placed sticker and reacts to new placements', () => {
    const engine = new InkEngine();
    const { container } = render(<StickerLayer engine={engine} page={1} />);
    expect(container.querySelectorAll('.sticker-layer__item')).toHaveLength(0);

    act(() => {
      engine.placeSticker({
        kind: 'sticker',
        sticker: 'star',
        x: 0.9,
        y: 0.1,
        size: 0.16,
        rotation: 0,
      });
    });

    expect(container.querySelectorAll('.sticker-layer__item')).toHaveLength(1);
  });

  it('shows only the active page stickers', () => {
    const engine = new InkEngine();
    engine.setActivePage(2);
    engine.placeSticker({
      kind: 'sticker',
      sticker: 'heart',
      x: 0.5,
      y: 0.5,
      size: 0.16,
      rotation: 0,
    });

    const { container } = render(<StickerLayer engine={engine} page={1} />);
    expect(container.querySelectorAll('.sticker-layer__item')).toHaveLength(0);
  });
});
