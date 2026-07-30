import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the landing page without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /every game/i })).toBeInTheDocument();
  });
});
