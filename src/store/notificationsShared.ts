/**
 * store/notificationsShared.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-featured Notifications store (Phase A6.8).
 * Supports: list, mark read, mark all read, delete, pagination, filters.
 * Distinct from the existing notificationsStore (toast notifications).
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, TTL, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import { optimisticUpdate, optimisticPatch, optimisticRemove } from '../api/optimistic';
import type {
  Notification,
  NotificationFilters,
  NotificationPagination,
} from '../types/shared';

// ─── State ────────────────────────────────────────────────────────────────────

export interface NotificationsSharedState {
  notifications: Notification[];
  filters: NotificationFilters;
  pagination: NotificationPagination;
  loading: boolean;
  error: string | null;
  unreadCount: number;
}

const initialState: NotificationsSharedState = {
  notifications: [],
  filters: { category: null, read: null },
  pagination: { page: 1, limit: 20, total: 0 },
  loading: false,
  error: null,
  unreadCount: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class NotificationsSharedStore extends Store<NotificationsSharedState> {
  constructor() {
    super(initialState);
  }

  // ─── Setters ────────────────────────────────────────────────────────────────

  setNotifications(notifications: Notification[]): void {
    this.setState({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  }

  setTotal(total: number): void {
    this.setState((s) => ({ pagination: { ...s.pagination, total } }));
  }

  setPage(page: number): void {
    this.setState((s) => ({ pagination: { ...s.pagination, page } }));
  }

  setFilters(filters: Partial<NotificationFilters>): void {
    this.setState((s) => ({
      filters: { ...s.filters, ...filters },
      pagination: { ...s.pagination, page: 1 },
    }));
  }

  private setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  private setError(error: string | null): void {
    this.setState({ error });
  }

  private recalcUnread(): void {
    const count = this.getState().notifications.filter((n) => !n.read).length;
    this.setState({ unreadCount: count });
  }

  // ─── Async: List ────────────────────────────────────────────────────────────

  async loadNotifications(forceRefresh = false): Promise<void> {
    const { pagination } = this.getState();
    const cacheKey = CacheKeys.notifications(pagination.page);

    if (!forceRefresh) {
      const cached = responseCache.get<{ notifications: Notification[]; total: number }>(cacheKey);
      if (cached) {
        this.setNotifications(cached.notifications);
        this.setTotal(cached.total);
        return;
      }
    }

    this.setLoading(true);
    this.setError(null);

    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ notifications: Notification[]; total: number }>(
          Endpoints.notifications.list(pagination.page, pagination.limit),
        ),
      );

      responseCache.set(cacheKey, res, TTL.NOTIFICATIONS);
      this.setNotifications(res.notifications ?? []);
      this.setTotal(res.total ?? 0);
    } catch (err: unknown) {
      this.setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      this.setLoading(false);
    }
  }

  // ─── Async: Mark read (optimistic) ──────────────────────────────────────────

  async markRead(id: string): Promise<void> {
    const prev = [...this.getState().notifications];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          notifications: optimisticPatch(s.notifications, id, { read: true }),
        }));
        this.recalcUnread();
      },
      rollback: () => {
        this.setNotifications(prev);
      },
      commit: () =>
        request.post<void>(Endpoints.notifications.markRead(id)),
      onError: (err) => {
        this.setError(err instanceof Error ? err.message : 'Failed to mark notification read');
      },
    });

    // Invalidate cache so next fetch is fresh
    responseCache.invalidatePrefix('notifications:');
  }

  // ─── Async: Mark all read (optimistic) ──────────────────────────────────────

  async markAllRead(): Promise<void> {
    const prev = [...this.getState().notifications];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },
      rollback: () => {
        this.setNotifications(prev);
      },
      commit: () =>
        request.post<void>(Endpoints.notifications.markAllRead()),
      onError: (err) => {
        this.setError(err instanceof Error ? err.message : 'Failed to mark all notifications read');
      },
    });

    responseCache.invalidatePrefix('notifications:');
  }

  // ─── Async: Delete (optimistic) ─────────────────────────────────────────────

  async deleteNotification(id: string): Promise<void> {
    const prev = [...this.getState().notifications];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          notifications: optimisticRemove(s.notifications, id),
          pagination: { ...s.pagination, total: Math.max(0, s.pagination.total - 1) },
        }));
        this.recalcUnread();
      },
      rollback: () => {
        this.setNotifications(prev);
      },
      commit: () =>
        request.delete<void>(Endpoints.notifications.delete(id)),
      onError: (err) => {
        this.setError(err instanceof Error ? err.message : 'Failed to delete notification');
      },
    });

    responseCache.invalidatePrefix('notifications:');
  }

  // ─── Derived: filtered list ──────────────────────────────────────────────────

  getFilteredNotifications(): Notification[] {
    const { notifications, filters } = this.getState();
    return notifications.filter((n) => {
      if (filters.category && n.category !== filters.category) return false;
      if (filters.read !== null && filters.read !== undefined && n.read !== filters.read) return false;
      return true;
    });
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const notificationsSharedStore = new NotificationsSharedStore();
