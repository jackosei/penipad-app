import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CompletionCard } from './CompletionCard';

describe('CompletionCard (F1.12)', () => {
  function setup(hasNextPage: boolean) {
    const onNextPage = vi.fn();
    const onGoHome = vi.fn();
    const onDismiss = vi.fn();
    const { container } = render(
      <CompletionCard
        sticker="star"
        hasNextPage={hasNextPage}
        onNextPage={onNextPage}
        onGoHome={onGoHome}
        onDismiss={onDismiss}
      />,
    );
    return { container, onNextPage, onGoHome, onDismiss };
  }

  it('celebrates and offers next page when there is one', () => {
    const { onNextPage } = setup(true);
    expect(screen.getByText('Amazing work!')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onNextPage).toHaveBeenCalledOnce();
  });

  it('omits next page on the last page', () => {
    setup(false);
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Go home' })).toBeInTheDocument();
  });

  it('go home routes home', () => {
    const { onGoHome } = setup(false);
    fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
    expect(onGoHome).toHaveBeenCalledOnce();
  });

  it('tapping the backdrop dismisses so the child can keep drawing', () => {
    const { container, onDismiss } = setup(true);
    const backdrop = container.querySelector('.completion__backdrop');
    expect(backdrop).not.toBeNull();
    if (backdrop) fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
