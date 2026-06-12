import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App', () => {
  it('renders the welcome screen with a gated add affordance on first run', async () => {
    render(<App />);

    expect(await screen.findByText(/let.s scribble/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add a worksheet/i })).toBeInTheDocument();
  });
});
