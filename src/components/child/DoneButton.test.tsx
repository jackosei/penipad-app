import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DoneButton } from './DoneButton';
import { StickerLayer } from './StickerLayer';
import { InkEngine } from '@/engine';

describe('DoneButton (F1.12)', () => {
  it('asks first, then fires onConfirm only after the child confirms', () => {
    const onConfirm = vi.fn();
    render(<DoneButton onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'done' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'yes' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancelling the confirm fires nothing', () => {
    const onConfirm = vi.fn();
    render(<DoneButton onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'done' }));
    fireEvent.click(screen.getByRole('button', { name: 'no' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the button itself is icon-only (no text label in the child zone)', () => {
    const { container } = render(<DoneButton onConfirm={vi.fn()} />);
    const doneButton = container.querySelector('.top-button--done');
    expect(doneButton?.textContent?.trim()).toBe('');
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
