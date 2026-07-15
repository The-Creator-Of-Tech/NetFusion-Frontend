/**
 * store/apiKeys.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * API Keys store for Phase A6.8.
 * Supports: list, create, rotate, revoke, copy, expiration, activity.
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, TTL, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import { optimisticUpdate, optimisticRemove, optimisticPatch } from '../api/optimistic';
import type {
  ApiKey,
  ApiKeyWithSecret,
  CreateApiKeyRequest,
  ApiKeyActivity,
} from '../types/shared';

// ─── State ────────────────────────────────────────────────────────────────────

export interface ApiKeysState {
  keys: ApiKey[];
  /** Newly created secret — shown once, then cleared */
  newKeySecret: string | null;
  newKeyName: string | null;
  /** Activity per key ID */
  activity: Record<string, ApiKeyActivity[]>;
  loading: boolean;
  loadingActivity: Record<string, boolean>;
  error: string | null;
}

const initialState: ApiKeysState = {
  keys: [],
  newKeySecret: null,
  newKeyName: null,
  activity: {},
  loading: false,
  loadingActivity: {},
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class ApiKeysStore extends Store<ApiKeysState> {
  constructor() {
    super(initialState);
  }

  // ─── Async: Load ────────────────────────────────────────────────────────────

  async loadKeys(forceRefresh = false): Promise<void> {
    const cacheKey = CacheKeys.apiKeys();

    if (!forceRefresh) {
      const cached = responseCache.get<{ keys: ApiKey[] }>(cacheKey);
      if (cached) {
        this.setState({ keys: cached.keys ?? [] });
        return;
      }
    }

    this.setState({ loading: true, error: null });
    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ keys: ApiKey[] }>(Endpoints.apiKeys.list()),
      );
      responseCache.set(cacheKey, res, TTL.DEFAULT);
      this.setState({ keys: res.keys ?? [] });
    } catch (err: unknown) {
      this.setState({ error: err instanceof Error ? err.message : 'Failed to load API keys' });
    } finally {
      this.setState({ loading: false });
    }
  }

  // ─── Async: Create ──────────────────────────────────────────────────────────

  async createKey(payload: CreateApiKeyRequest): Promise<ApiKeyWithSecret> {
    this.setState({ error: null });
    try {
      const res = await request.post<{ key: ApiKeyWithSecret }>(
        Endpoints.apiKeys.create(),
        payload,
      );
      const { secret, ...keyWithoutSecret } = res.key;
      this.setState((s) => ({
        keys: [keyWithoutSecret, ...s.keys],
        newKeySecret: secret,
        newKeyName: res.key.name,
      }));
      responseCache.invalidate(CacheKeys.apiKeys());
      return res.key;
    } catch (err: unknown) {
      this.setState({ error: err instanceof Error ? err.message : 'Failed to create API key' });
      throw err;
    }
  }

  /** Clear the newly-created secret from state (call after user copies it). */
  clearNewKeySecret(): void {
    this.setState({ newKeySecret: null, newKeyName: null });
  }

  // ─── Async: Rotate ──────────────────────────────────────────────────────────

  async rotateKey(keyId: string): Promise<ApiKeyWithSecret> {
    this.setState({ error: null });
    try {
      const res = await request.post<{ key: ApiKeyWithSecret }>(
        Endpoints.apiKeys.rotate(keyId),
      );
      const { secret, ...keyWithoutSecret } = res.key;
      this.setState((s) => ({
        keys: s.keys.map((k) => (k.id === keyId ? keyWithoutSecret : k)),
        newKeySecret: secret,
        newKeyName: res.key.name,
      }));
      responseCache.invalidate(CacheKeys.apiKeys());
      return res.key;
    } catch (err: unknown) {
      this.setState({ error: err instanceof Error ? err.message : 'Failed to rotate API key' });
      throw err;
    }
  }

  // ─── Async: Revoke (optimistic) ─────────────────────────────────────────────

  async revokeKey(keyId: string): Promise<void> {
    const prev = [...this.getState().keys];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          keys: optimisticPatch(s.keys, keyId, { status: 'revoked' }),
        }));
      },
      rollback: () => {
        this.setState({ keys: prev });
      },
      commit: () => request.post<void>(Endpoints.apiKeys.revoke(keyId)),
      onError: (err) => {
        this.setState({ error: err instanceof Error ? err.message : 'Failed to revoke key' });
      },
    });

    responseCache.invalidate(CacheKeys.apiKeys());
  }

  // ─── Async: Delete (optimistic) ─────────────────────────────────────────────

  async deleteKey(keyId: string): Promise<void> {
    const prev = [...this.getState().keys];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          keys: optimisticRemove(s.keys, keyId),
        }));
      },
      rollback: () => {
        this.setState({ keys: prev });
      },
      commit: () => request.delete<void>(Endpoints.apiKeys.delete(keyId)),
      onError: (err) => {
        this.setState({ error: err instanceof Error ? err.message : 'Failed to delete key' });
      },
    });

    responseCache.invalidate(CacheKeys.apiKeys());
  }

  // ─── Async: Activity ────────────────────────────────────────────────────────

  async loadActivity(keyId: string): Promise<void> {
    this.setState((s) => ({
      loadingActivity: { ...s.loadingActivity, [keyId]: true },
    }));
    try {
      const res = await request.get<{ activity: ApiKeyActivity[] }>(
        Endpoints.apiKeys.activity(keyId),
      );
      this.setState((s) => ({
        activity: { ...s.activity, [keyId]: res.activity ?? [] },
      }));
    } catch {
      // Non-critical — silently fail activity load
    } finally {
      this.setState((s) => ({
        loadingActivity: { ...s.loadingActivity, [keyId]: false },
      }));
    }
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const apiKeysStore = new ApiKeysStore();
