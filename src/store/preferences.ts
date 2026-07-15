/**
 * store/preferences.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * User Preferences store for Phase A6.8.
 * Supports: theme, language, dashboard prefs, AI prefs, notification prefs.
 * Persists through backend API. Cache invalidated on every write.
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, TTL, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import type {
  UserPreferences,
  UpdatePreferencesRequest,
  Theme,
  Language,
  DensityMode,
  DashboardPreferences,
  AiPreferences,
  NotificationPreferences,
} from '../types/shared';

// ─── Default preferences ──────────────────────────────────────────────────────

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  language: 'en',
  density: 'comfortable',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  dashboard: {
    defaultView: 'grid',
    showStats: true,
    showCharts: true,
    showActivity: true,
    defaultProjectSort: 'updatedAt',
  },
  ai: {
    defaultProvider: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    streamingEnabled: true,
    reasoningEnabled: true,
    contextSize: 'medium',
    temperature: 0.7,
  },
  notifications: {
    emailEnabled: true,
    browserEnabled: true,
    findingAlerts: true,
    workflowAlerts: true,
    systemAlerts: true,
    digestFrequency: 'realtime',
  },
};

// ─── State ────────────────────────────────────────────────────────────────────

export interface PreferencesState {
  preferences: UserPreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSavedAt: string | null;
}

const initialState: PreferencesState = {
  preferences: DEFAULT_PREFERENCES,
  loading: false,
  saving: false,
  error: null,
  lastSavedAt: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class PreferencesStore extends Store<PreferencesState> {
  constructor() {
    super(initialState);
  }

  // ─── Async: Load ────────────────────────────────────────────────────────────

  async loadPreferences(userId: string, forceRefresh = false): Promise<void> {
    const cacheKey = CacheKeys.preferences(userId);

    if (!forceRefresh) {
      const cached = responseCache.get<{ preferences: UserPreferences }>(cacheKey);
      if (cached) {
        this.setState({
          preferences: { ...DEFAULT_PREFERENCES, ...cached.preferences },
        });
        return;
      }
    }

    this.setState({ loading: true, error: null });
    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ preferences: UserPreferences }>(Endpoints.preferences.get()),
      );
      responseCache.set(cacheKey, res, TTL.PREFERENCES);
      this.setState({
        preferences: { ...DEFAULT_PREFERENCES, ...res.preferences },
      });
    } catch (err: unknown) {
      // Fall back to defaults gracefully — preferences are non-critical
      this.setState({
        error: err instanceof Error ? err.message : 'Failed to load preferences',
        preferences: DEFAULT_PREFERENCES,
      });
    } finally {
      this.setState({ loading: false });
    }
  }

  // ─── Async: Update ──────────────────────────────────────────────────────────

  async updatePreferences(
    userId: string,
    patch: UpdatePreferencesRequest,
  ): Promise<void> {
    // Apply immediately (preferences update should feel instant)
    const prev = { ...this.getState().preferences };
    this.setState((s) => ({
      preferences: { ...s.preferences, ...patch },
      saving: true,
      error: null,
    }));

    try {
      const res = await request.patch<{ preferences: UserPreferences }>(
        Endpoints.preferences.update(),
        patch,
      );
      this.setState({
        preferences: { ...DEFAULT_PREFERENCES, ...res.preferences },
        lastSavedAt: new Date().toISOString(),
        saving: false,
      });
      // Invalidate cache — preferences changed
      responseCache.invalidate(CacheKeys.preferences(userId));
    } catch (err: unknown) {
      // Rollback
      this.setState({
        preferences: prev,
        error: err instanceof Error ? err.message : 'Failed to save preferences',
        saving: false,
      });
      throw err;
    }
  }

  // ─── Convenience setters (local-only, call updatePreferences to persist) ────

  setTheme(theme: Theme): void {
    this.setState((s) => ({
      preferences: { ...s.preferences, theme },
    }));
  }

  setLanguage(language: Language): void {
    this.setState((s) => ({
      preferences: { ...s.preferences, language },
    }));
  }

  setDensity(density: DensityMode): void {
    this.setState((s) => ({
      preferences: { ...s.preferences, density },
    }));
  }

  setDashboardPrefs(dashboard: Partial<DashboardPreferences>): void {
    this.setState((s) => ({
      preferences: {
        ...s.preferences,
        dashboard: { ...s.preferences.dashboard, ...dashboard },
      },
    }));
  }

  setAiPrefs(ai: Partial<AiPreferences>): void {
    this.setState((s) => ({
      preferences: {
        ...s.preferences,
        ai: { ...s.preferences.ai, ...ai },
      },
    }));
  }

  setNotificationPrefs(notifications: Partial<NotificationPreferences>): void {
    this.setState((s) => ({
      preferences: {
        ...s.preferences,
        notifications: { ...s.preferences.notifications, ...notifications },
      },
    }));
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const preferencesStore = new PreferencesStore();
