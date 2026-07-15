/**
 * hooks/usePreferences.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for User Preferences.
 * Loads on mount, persists through backend API.
 * Cache invalidated on every write.
 */

import { useEffect, useCallback } from 'react';
import { preferencesStore } from '../store/preferences';
import type {
  UpdatePreferencesRequest,
  Theme,
  Language,
  DensityMode,
  DashboardPreferences,
  AiPreferences,
  NotificationPreferences,
} from '../types/shared';

export function usePreferences(userId: string) {
  const state = preferencesStore.useStore();

  useEffect(() => {
    if (userId) preferencesStore.loadPreferences(userId);
  }, [userId]);

  const refresh = useCallback(
    () => preferencesStore.loadPreferences(userId, true),
    [userId],
  );

  const updatePreferences = useCallback(
    (patch: UpdatePreferencesRequest) => preferencesStore.updatePreferences(userId, patch),
    [userId],
  );

  const setTheme = useCallback((theme: Theme) => {
    preferencesStore.setTheme(theme);
    preferencesStore.updatePreferences(userId, { theme }).catch(() => {});
  }, [userId]);

  const setLanguage = useCallback((language: Language) => {
    preferencesStore.setLanguage(language);
    preferencesStore.updatePreferences(userId, { language }).catch(() => {});
  }, [userId]);

  const setDensity = useCallback((density: DensityMode) => {
    preferencesStore.setDensity(density);
    preferencesStore.updatePreferences(userId, { density }).catch(() => {});
  }, [userId]);

  const setDashboardPrefs = useCallback(
    (dashboard: Partial<DashboardPreferences>) => {
      preferencesStore.setDashboardPrefs(dashboard);
      const current = preferencesStore.getState().preferences;
      preferencesStore
        .updatePreferences(userId, { dashboard: { ...current.dashboard, ...dashboard } })
        .catch(() => {});
    },
    [userId],
  );

  const setAiPrefs = useCallback(
    (ai: Partial<AiPreferences>) => {
      preferencesStore.setAiPrefs(ai);
      const current = preferencesStore.getState().preferences;
      preferencesStore
        .updatePreferences(userId, { ai: { ...current.ai, ...ai } })
        .catch(() => {});
    },
    [userId],
  );

  const setNotificationPrefs = useCallback(
    (notifications: Partial<NotificationPreferences>) => {
      preferencesStore.setNotificationPrefs(notifications);
      const current = preferencesStore.getState().preferences;
      preferencesStore
        .updatePreferences(userId, { notifications: { ...current.notifications, ...notifications } })
        .catch(() => {});
    },
    [userId],
  );

  return {
    preferences: state.preferences,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    lastSavedAt: state.lastSavedAt,
    refresh,
    updatePreferences,
    setTheme,
    setLanguage,
    setDensity,
    setDashboardPrefs,
    setAiPrefs,
    setNotificationPrefs,
  };
}
