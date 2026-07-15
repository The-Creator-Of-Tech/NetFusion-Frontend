/**
 * store/activityFeed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Activity Feed store for Phase A6.8.
 * Displays: user activity, investigation activity, AI activity, workflow activity.
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, TTL, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import type {
  ActivityEntry,
  ActivityFilters,
  ActivityType,
  ActivitySeverity,
} from '../types/shared';

// ─── State ────────────────────────────────────────────────────────────────────

export interface ActivityFeedState {
  entries: ActivityEntry[];
  filters: ActivityFilters;
  pagination: { page: number; limit: number; total: number };
  loading: boolean;
  error: string | null;
}

const initialState: ActivityFeedState = {
  entries: [],
  filters: {
    type: null,
    severity: null,
    projectId: null,
    search: '',
    dateFrom: null,
    dateTo: null,
  },
  pagination: { page: 1, limit: 25, total: 0 },
  loading: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class ActivityFeedStore extends Store<ActivityFeedState> {
  constructor() {
    super(initialState);
  }

  // ─── Setters ────────────────────────────────────────────────────────────────

  setFilters(filters: Partial<ActivityFilters>): void {
    this.setState((s) => ({
      filters: { ...s.filters, ...filters },
      pagination: { ...s.pagination, page: 1 },
    }));
  }

  resetFilters(): void {
    this.setState((s) => ({
      filters: initialState.filters,
      pagination: { ...s.pagination, page: 1 },
    }));
  }

  setPage(page: number): void {
    this.setState((s) => ({
      pagination: { ...s.pagination, page: Math.max(1, page) },
    }));
  }

  // ─── Async: Load ────────────────────────────────────────────────────────────

  async loadFeed(forceRefresh = false): Promise<void> {
    const { filters, pagination } = this.getState();

    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.search) params.set('q', filters.search);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('page', String(pagination.page));
    params.set('limit', String(pagination.limit));

    const paramStr = params.toString();
    const cacheKey = CacheKeys.activityFeed(paramStr);

    if (!forceRefresh) {
      const cached = responseCache.get<{ entries: ActivityEntry[]; total: number }>(cacheKey);
      if (cached) {
        this.setState({
          entries: cached.entries ?? [],
          pagination: { ...pagination, total: cached.total ?? 0 },
        });
        return;
      }
    }

    this.setState({ loading: true, error: null });
    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ entries: ActivityEntry[]; total: number }>(
          Endpoints.activityFeed.list(paramStr),
        ),
      );
      responseCache.set(cacheKey, res, TTL.ACTIVITY);
      this.setState({
        entries: res.entries ?? [],
        pagination: { ...pagination, total: res.total ?? 0 },
      });
    } catch (err: unknown) {
      this.setState({ error: err instanceof Error ? err.message : 'Failed to load activity feed' });
    } finally {
      this.setState({ loading: false });
    }
  }

  // ─── Derived: filtered client-side (when full list is cached) ───────────────

  getFilteredEntries(): ActivityEntry[] {
    const { entries, filters } = this.getState();
    return entries.filter((e) => {
      if (filters.type && e.type !== filters.type) return false;
      if (filters.severity && e.severity !== filters.severity) return false;
      if (filters.projectId && e.projectId !== filters.projectId) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          e.title.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q) ||
          (e.actor?.name ?? '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const activityFeedStore = new ActivityFeedStore();
