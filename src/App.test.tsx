import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import './shared/i18n';

describe('App', () => {
  it('renders the full-screen foundation layout', async () => {
    render(<App />);
    expect(screen.getAllByText('FavGrove').length).toBeGreaterThan(0);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('All bookmark data stays in your browser.')).toBeInTheDocument();
    expect(screen.getByText('v0.3.0 · everettlabs · everett7623@gmail.com')).toBeInTheDocument();
  });
});
