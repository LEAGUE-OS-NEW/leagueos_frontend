import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FanWallet from './FanWallet';
import { useFanWallet } from '../../../hooks/useFanWallet';
import { fetchFanWalletTransactions } from '../../../services/fanWalletApiService';

vi.mock('../../../components/fan/Sidebar', () => ({
  default: () => null,
}));

vi.mock('../sections/Topbar', () => ({
  default: () => null,
}));

vi.mock('../../../components/landing/Footer', () => ({
  default: () => null,
}));

vi.mock('../../../hooks/useFanWallet', () => ({
  useFanWallet: vi.fn(),
}));

vi.mock('../../../services/fanWalletApiService', () => ({
  fetchFanWalletTransactions: vi.fn(),
}));

describe('FanWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFanWallet).mockReturnValue({
      wallet: null,
      isLoading: false,
      error: '',
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(fetchFanWalletTransactions).mockResolvedValue([]);
  });

  it('loads the wallet without requiring Markets eligibility', async () => {
    render(
      <MemoryRouter>
        <FanWallet />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No UGX wallet found'),
    ).toBeInTheDocument();

    expect(useFanWallet).toHaveBeenCalledWith('UGX');

    expect(
      screen.queryByText('Identity verification required'),
    ).not.toBeInTheDocument();

    expect(
      fetchFanWalletTransactions,
    ).toHaveBeenCalledTimes(1);
  });
});
