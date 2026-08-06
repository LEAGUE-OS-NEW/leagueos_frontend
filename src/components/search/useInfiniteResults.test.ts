import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useInfiniteResults } from './useInfiniteResults';

describe('useInfiniteResults', () => {
  it('reveals more items on loadMore and restarts at page 1 on reset', () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    const { result } = renderHook(() => useInfiniteResults(items, 10));

    expect(result.current.visibleItems).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toHaveLength(30);
    expect(result.current.hasMore).toBe(false);

    act(() => result.current.reset());
    expect(result.current.visibleItems).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);
  });
});
