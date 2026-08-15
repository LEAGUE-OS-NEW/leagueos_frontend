import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import OrderPlaced from './OrderPlaced';

vi.mock('../../../components/fan/Sidebar', () => ({ default: () => null }));
vi.mock('../sections/Topbar', () => ({ default: () => null }));
vi.mock('../../../components/landing/Footer', () => ({ default: () => null }));

function renderState(state: Record<string, unknown>) {
  render(<MemoryRouter initialEntries={[{ pathname: '/fan/markets/market-1/placed', state }]}><Routes><Route path="/fan/markets/:marketId/placed" element={<OrderPlaced />} /></Routes></MemoryRouter>);
}

describe('OrderPlaced backend statuses', () => {
  it('shows an OPEN order as waiting on the order book', () => {
    renderState({ status: 'OPEN', outcome: 'Yes', price: 5000, amount: 10000, contracts: 2 });
    expect(screen.getByText('Your limit order is resting on the order book.')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('shows a FILLED order as executed with its actual average fill price', () => {
    renderState({ status: 'FILLED', outcome: 'Yes', price: 5000, amount: 10000, contracts: 2, averageFillPrice: 4800 });
    expect(screen.getByText('Your order was executed.')).toBeInTheDocument();
    expect(screen.getByText('Actual average fill price')).toBeInTheDocument();
    expect(screen.getByText('4,800 UGX')).toBeInTheDocument();
  });
});
