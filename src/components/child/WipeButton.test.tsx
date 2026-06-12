import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WipeButton } from './WipeButton';
import { InkEngine } from '@/engine';

const view = { originX: 0, originY: 0, width: 1000, height: 1000 };

function drawStroke(engine: InkEngine): void {
  engine.beginStroke({ x: 100, y: 100, pressure: 0.5 }, view);
  engine.endStroke();
}

describe('WipeButton (F1.4 clear page with confirm)', () => {
  it('only wipes after the child confirms', () => {
    const engine = new InkEngine();
    drawStroke(engine);
    render(<WipeButton engine={engine} />);

    fireEvent.click(screen.getByRole('button', { name: 'wipe page' }));
    expect(engine.getMarkCount()).toBe(1); // still there

    fireEvent.click(screen.getByRole('button', { name: 'yes' }));
    expect(engine.getMarkCount()).toBe(0);
  });

  it('cancelling keeps the drawing untouched', () => {
    const engine = new InkEngine();
    drawStroke(engine);
    render(<WipeButton engine={engine} />);

    fireEvent.click(screen.getByRole('button', { name: 'wipe page' }));
    fireEvent.click(screen.getByRole('button', { name: 'no' }));

    expect(engine.getMarkCount()).toBe(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is icon-only (no text label in the child zone)', () => {
    const { container } = render(<WipeButton engine={new InkEngine()} />);
    expect(container.textContent?.trim()).toBe('');
  });
});
