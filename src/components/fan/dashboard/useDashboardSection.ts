import { useEffect, useState } from 'react';

type SectionState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Fetch/loading/error/retry state for one independent dashboard card.
 * `fetcher` must be a stable, module-level function reference (e.g. pass
 * `fetchFixtures` directly, not `() => fetchFixtures()`) — an inline
 * closure would be recreated every render and re-trigger the effect.
 */
export function useDashboardSection<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<SectionState<T>>({ data: null, isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, isLoading: false, error: 'Could not load this section. Please try again.' });
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const retry = () => {
    setState({ data: null, isLoading: true, error: null });
    fetcher()
      .then((data) => setState({ data, isLoading: false, error: null }))
      .catch(() => setState({ data: null, isLoading: false, error: 'Could not load this section. Please try again.' }));
  };

  return { ...state, retry };
}
