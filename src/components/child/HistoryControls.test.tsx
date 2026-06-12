import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { HistoryControls } from './HistoryControls';
import { InkEngine } from '@/engine';

const view = { originX: 0, originY: 0, width: 1000, height: 1000 };

function draw(engine: InkEngine, x: number): void {
  engine.beginStroke({ x, y: x, pressure: 0.5 }, view);
  engine.endStroke();
}

describe('HistoryControls', () => {
  let engine: InkEngine;

  beforeEach(() => {
    engine = new InkEngine();
  });

  it('disables undo and redo when there is no history', () => {
    render(<HistoryControls engine={engine} page={1} />);
    expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'redo' })).toBeDisabled();
  });

  it('undo removes the last mark and enables redo', () => {
    draw(engine, 10);
    render(<HistoryControls engine={engine} page={1} />);

    const undo = screen.getByRole('button', { name: 'undo' });
    const redo = screen.getByRole('button', { name: 'redo' });
    expect(undo).toBeEnabled();
    expect(redo).toBeDisabled();

    fireEvent.click(undo);
    expect(engine.getMarkCount()).toBe(0);
    expect(redo).toBeEnabled();
  });

  it('redo restores the undone mark', () => {
    draw(engine, 10);
    render(<HistoryControls engine={engine} page={1} />);

    fireEvent.click(screen.getByRole('button', { name: 'undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'redo' }));

    expect(engine.getMarkCount()).toBe(1);
    expect(screen.getByRole('button', { name: 'redo' })).toBeDisabled();
  });
});
