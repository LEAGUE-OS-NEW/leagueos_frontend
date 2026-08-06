import { useState } from 'react';

interface UseInfiniteResults<T> {
  visibleItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
}

// Client-side windowing over an already-filtered array. None of the sources
// behind global search support server-side pagination, so "load more"
// simply reveals more of what's already been fetched. Callers must call
// reset() whenever their filters change (new search text, tab, or sport
// pill) so a new query doesn't stay scrolled deep into the old result set.
export function useInfiniteResults<T>(items: T[], pageSize = 12): UseInfiniteResults<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    loadMore: () => setVisibleCount((current) => current + pageSize),
    reset: () => setVisibleCount(pageSize),
  };
}
