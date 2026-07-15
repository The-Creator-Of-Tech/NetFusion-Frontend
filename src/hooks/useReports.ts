/**
 * hooks/useReports.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for the reports list view.
 * Auto-loads on mount, exposes filtered/sorted/paged data,
 * and provides refresh, filter, sort, and pagination controls.
 */

import { useEffect, useCallback } from 'react';
import { reportsStore } from '../store/reports';
import type { ReportFilters, ReportSortBy, SortOrder } from '../types/reports';

export function useReports(projectId: string) {
  const state = reportsStore.useStore();

  // Auto-load on mount / projectId change
  useEffect(() => {
    if (projectId) {
      reportsStore.loadReports(projectId);
    }
  }, [projectId]);

  const refresh = useCallback(() => reportsStore.loadReports(projectId), [projectId]);

  const setFilters = useCallback(
    (filters: Partial<ReportFilters>) => reportsStore.setFilters(filters),
    [],
  );

  const resetFilters = useCallback(() => reportsStore.resetFilters(), []);

  const setSortBy = useCallback((sortBy: ReportSortBy) => {
    if (state.sortBy === sortBy) {
      reportsStore.toggleSortOrder();
    } else {
      reportsStore.setSortBy(sortBy);
      reportsStore.setSortOrder('desc');
    }
  }, [state.sortBy]);

  const setPage = useCallback((page: number) => reportsStore.setPage(page), []);
  const setLimit = useCallback((limit: number) => reportsStore.setLimit(limit), []);

  const nextPage = useCallback(() => {
    const { page, total, limit } = state.pagination;
    const totalPages = Math.ceil(total / limit) || 1;
    if (page < totalPages) reportsStore.setPage(page + 1);
  }, [state.pagination]);

  const prevPage = useCallback(() => {
    if (state.pagination.page > 1) reportsStore.setPage(state.pagination.page - 1);
  }, [state.pagination.page]);

  // Derived values
  const filteredSorted = reportsStore.getFilteredSortedReports();
  const totalFiltered = filteredSorted.length;
  const { limit, page } = state.pagination;
  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const offset = (page - 1) * limit;
  const pagedReports = filteredSorted.slice(offset, offset + limit);

  return {
    // Data
    reports: state.reports,
    pagedReports,
    filteredSorted,
    totalFiltered,

    // Filters & sort
    filters: state.filters,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    setFilters,
    resetFilters,
    setSortBy,

    // Pagination
    page,
    limit,
    totalPages,
    offset,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    setPage,
    setLimit,
    nextPage,
    prevPage,

    // Status
    loading: state.loading.list,
    error: state.error.list,
    lastRefreshedAt: state.lastRefreshedAt,

    // Actions
    refresh,
  };
}
