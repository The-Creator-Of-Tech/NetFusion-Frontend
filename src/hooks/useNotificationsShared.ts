/**
 * hooks/useNotificationsShared.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for the full-featured Notifications module (Phase A6.8).
 * Handles pagination, filters, mark read, mark all read, delete.
 * Background refresh respects tab visibility.
 */

import { useEffect, useCallback, useRef } from 'react';
import { notificationsSharedStore } from '../store/notificationsShared';
import type { NotificationFilters } from '../types/shared';

const REFRESH_INTERVAL_MS = 15_000; // 15s — matches TTL

export function useNotificationsShared() {
  const state = notificationsSharedStore.useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    notificationsSharedStore.loadNotifications();
  }, []);

  // ─── Background refresh with Visibility API ─────────────────────────────────
  useEffect(() => {
    function startPolling() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          notificationsSharedStore.loadNotifications();
        }
      }, REFRESH_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stopPolling();
      } else {
        // Resume + immediate refresh on focus
        notificationsSharedStore.loadNotifications();
        startPolling();
      }
    }

    startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const refresh = useCallback(() => notificationsSharedStore.loadNotifications(true), []);
  const markRead = useCallback((id: string) => notificationsSharedStore.markRead(id), []);
  const markAllRead = useCallback(() => notificationsSharedStore.markAllRead(), []);
  const deleteNotification = useCallback(
    (id: string) => notificationsSharedStore.deleteNotification(id),
    [],
  );
  const setFilters = useCallback(
    (f: Partial<NotificationFilters>) => notificationsSharedStore.setFilters(f),
    [],
  );
  const setPage = useCallback((page: number) => notificationsSharedStore.setPage(page), []);

  const filtered = notificationsSharedStore.getFilteredNotifications();

  return {
    notifications: state.notifications,
    filtered,
    unreadCount: state.unreadCount,
    filters: state.filters,
    pagination: state.pagination,
    loading: state.loading,
    error: state.error,
    refresh,
    markRead,
    markAllRead,
    deleteNotification,
    setFilters,
    setPage,
  };
}
