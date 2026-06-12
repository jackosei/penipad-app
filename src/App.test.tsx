import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App', () => {
  it('renders the shelf with the empty state and a gated import affordance', async () => {
    render(<App />);

    expect(await screen.findByText('Add a worksheet PDF to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'add worksheet' })).toBeInTheDocument();
  });
});
