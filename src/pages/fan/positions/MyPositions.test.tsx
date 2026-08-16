import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MyPositions from './MyPositions';
import { fetchFanPositions } from '../../../services/fanMarketsServices';

vi.mock('../../../components/fan/Sidebar', () => ({
  default: () => null,
}));

vi.mock('../sections/Topbar', () => ({
  default: () => null,
}));

vi.mock('../../../components/landing/Footer', () => ({
  default: () => null,
}));

vi.mock('../../../services/fanMarketsServices', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../services/fanMarketsServices')
    >();

  return {
    ...actual,
    fetchFanPositions: vi.fn(),
  };
});

describe('MyPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchFanPositions).mockResolvedValue([]);
  });

  it('loads authenticated positions without a market eligibility gate', async () => {
    render(
      <MemoryRouter>
        <MyPositions />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No positions yet'),
    ).toBeInTheDocument();

    expect(fetchFanPositions).toHaveBeenCalledTimes(1);

    expect(
      screen.queryByText('Verify your identity to trade'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Verify your email to trade'),
    ).not.toBeInTheDocument();
  });
});
