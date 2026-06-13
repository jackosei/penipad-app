import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentGate } from './ParentGate';
import { PARENT_GATE_HOLD_MS } from '@/constants';

describe('ParentGate', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function completeHold(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: /hold to continue/i }));
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS + 200);
    });
  }

  /** Read the rendered sum and click the correct option. */
  function answerCorrectly(container: HTMLElement): void {
    const sum = container.querySelector('.gate-card__sum')?.textContent ?? '';
    const match = /(\d+)\s*\+\s*(\d+)/.exec(sum);
    if (!match) throw new Error(`could not parse sum: "${sum}"`);
    const answer = Number(match[1]) + Number(match[2]);
    const options = container.querySelector('.gate-card__options') as HTMLElement;
    fireEvent.click(within(options).getByRole('button', { name: String(answer) }));
  }

  it('requires the hold first, then the maths challenge, before unlocking', () => {
    const onUnlock = vi.fn();
    const { container } = render(
      <ParentGate label="Test action." onUnlock={onUnlock} onDismiss={vi.fn()} />,
    );

    // The maths challenge is not reachable without completing the hold.
    expect(container.querySelector('.gate-card__sum')).toBeNull();

    completeHold();
    expect(container.querySelector('.gate-card__sum')).not.toBeNull();
    expect(onUnlock).not.toHaveBeenCalled(); // hold alone does not unlock

    answerCorrectly(container);
    expect(onUnlock).toHaveBeenCalledOnce();
  });

  it('does not advance to maths when the hold is released early', () => {
    const { container } = render(
      <ParentGate label="Test action." onUnlock={vi.fn()} onDismiss={vi.fn()} />,
    );

    const hold = screen.getByRole('button', { name: /hold to continue/i });
    fireEvent.pointerDown(hold);
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS / 2);
    });
    fireEvent.pointerUp(hold);
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS * 2);
    });

    expect(container.querySelector('.gate-card__sum')).toBeNull();
  });

  it('a wrong answer does not unlock and presents a fresh sum', () => {
    const onUnlock = vi.fn();
    const { container } = render(
      <ParentGate label="Test action." onUnlock={onUnlock} onDismiss={vi.fn()} />,
    );
    completeHold();

    const sum = container.querySelector('.gate-card__sum')?.textContent ?? '';
    const match = /(\d+)\s*\+\s*(\d+)/.exec(sum);
    const answer = Number(match?.[1]) + Number(match?.[2]);
    const options = container.querySelector('.gate-card__options') as HTMLElement;
    const wrong = within(options)
      .getAllByRole('button')
      .find((b) => b.textContent !== String(answer));
    if (wrong) fireEvent.click(wrong);

    expect(onUnlock).not.toHaveBeenCalled();
    expect(container.querySelector('.gate-card__sum')).not.toBeNull();
  });

  it('dismisses without unlocking', () => {
    const onUnlock = vi.fn();
    const onDismiss = vi.fn();
    render(<ParentGate label="Test action." onUnlock={onUnlock} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
