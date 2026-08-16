import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  fetchFanWallet,
  type FanWalletBalance,
} from '../services/fanWalletApiService';

interface UseFanWalletResult {
  wallet: FanWalletBalance | null;
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export function useFanWallet(
  currency = 'UGX',
  enabled = true,
): UseFanWalletResult {
  const [wallet, setWallet] =
    useState<FanWalletBalance | null>(null);

  // Start true so the page does not briefly display a fake
  // zero balance while the first real request is running.
  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const next =
        await fetchFanWallet(currency);

      setWallet(next);
    } catch (loadError) {
      setWallet(null);

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load wallet.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    currency,
    enabled,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    fetchFanWallet(currency)
      .then((next) => {
        if (!cancelled) {
          setWallet(next);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setWallet(null);

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load wallet.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currency,
    enabled,
  ]);

  return {
    wallet,
    isLoading,
    error,
    refresh,
  };
}
