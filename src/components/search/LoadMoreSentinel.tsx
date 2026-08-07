import { useEffect, useRef } from 'react';

interface LoadMoreSentinelProps {
  hasMore: boolean;
  onLoadMore: () => void;
}

// Auto-loads the next page once scrolled near view, backed by a manual
// "Load more" button underneath as a visible, always-present fallback
// (accessibility, and environments without IntersectionObserver support).
function LoadMoreSentinel({ hasMore, onLoadMore }: LoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div className="search-load-more" ref={sentinelRef}>
      <button type="button" className="search-load-more__button" onClick={onLoadMore}>
        Load more
      </button>
    </div>
  );
}

export default LoadMoreSentinel;
