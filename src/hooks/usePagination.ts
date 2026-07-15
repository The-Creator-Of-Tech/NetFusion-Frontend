import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  initialTotal?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const [page, setPageState] = useState<number>(options.initialPage ?? 1);
  const [limit, setLimitState] = useState<number>(options.initialLimit ?? 10);
  const [total, setTotalState] = useState<number>(options.initialTotal ?? 0);

  const totalPages = useMemo(() => {
    return Math.ceil(total / limit) || 1;
  }, [total, limit]);

  const offset = useMemo(() => {
    return (page - 1) * limit;
  }, [page, limit]);

  const setPage = useCallback(
    (targetPage: number) => {
      setPageState((prev) => {
        const bounds = Math.max(1, Math.min(targetPage, totalPages));
        return bounds;
      });
    },
    [totalPages]
  );

  const setLimit = useCallback((targetLimit: number) => {
    setLimitState(Math.max(1, targetLimit));
    setPageState(1); // Reset page on limit changes
  }, []);

  const setTotal = useCallback((targetTotal: number) => {
    setTotalState(Math.max(0, targetTotal));
  }, []);

  const nextPage = useCallback(() => {
    setPageState((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPageState((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  const hasNextPage = useMemo(() => page < totalPages, [page, totalPages]);
  const hasPrevPage = useMemo(() => page > 1, [page]);

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  };
}
export type UsePaginationReturn = ReturnType<typeof usePagination>;
