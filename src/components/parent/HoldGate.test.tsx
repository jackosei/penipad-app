import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoldGate } from './HoldGate';
import { PARENT_GATE_HOLD_MS } from '@/constants';

describe('HoldGate', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('unlocks after a full uninterrupted hold', () => {
    const onUnlock = vi.fn();
    render(<HoldGate label="Test action." onUnlock={onUnlock} onDismiss={vi.fn()} />);

    const hold = screen.getByRole('button', { name: /hold to continue/i });
    fireEvent.pointerDown(hold);
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS + 200);
    });

    expect(onUnlock).toHaveBeenCalledOnce();
  });

  it('does not unlock when the hold is released early', () => {
    const onUnlock = vi.fn();
    render(<HoldGate label="Test action." onUnlock={onUnlock} onDismiss={vi.fn()} />);

    const hold = screen.getByRole('button', { name: /hold to continue/i });
    fireEvent.pointerDown(hold);
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS / 2);
    });
    fireEvent.pointerUp(hold);
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS * 2);
    });

    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('does not unlock when the pointer slides off the button (child swipe)', () => {
    const onUnlock = vi.fn();
    render(<HoldGate label="Test action." onUnlock={onUnlock} onDismiss={vi.fn()} />);

    const hold = screen.getByRole('button', { name: /hold to continue/i });
    fireEvent.pointerDown(hold);
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS / 2);
    });
    fireEvent.pointerLeave(hold);
    act(() => {
      vi.advanceTimersByTime(PARENT_GATE_HOLD_MS * 2);
    });

    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('dismisses without unlocking', () => {
    const onUnlock = vi.fn();
    const onDismiss = vi.fn();
    render(<HoldGate label="Test action." onUnlock={onUnlock} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
