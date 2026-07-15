/**
 * hooks/useApiKeys.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for API Key management.
 * Supports list, create, rotate, revoke, delete, copy, activity.
 */

import { useEffect, useCallback } from 'react';
import { apiKeysStore } from '../store/apiKeys';
import type { CreateApiKeyRequest } from '../types/shared';

export function useApiKeys() {
  const state = apiKeysStore.useStore();

  useEffect(() => {
    apiKeysStore.loadKeys();
  }, []);

  const refresh = useCallback(() => apiKeysStore.loadKeys(true), []);
  const createKey = useCallback(
    (payload: CreateApiKeyRequest) => apiKeysStore.createKey(payload),
    [],
  );
  const rotateKey = useCallback((keyId: string) => apiKeysStore.rotateKey(keyId), []);
  const revokeKey = useCallback((keyId: string) => apiKeysStore.revokeKey(keyId), []);
  const deleteKey = useCallback((keyId: string) => apiKeysStore.deleteKey(keyId), []);
  const clearNewKeySecret = useCallback(() => apiKeysStore.clearNewKeySecret(), []);
  const loadActivity = useCallback((keyId: string) => apiKeysStore.loadActivity(keyId), []);

  /** Copy key secret to clipboard (browser API). */
  const copySecret = useCallback(async (secret: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(secret);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const activeKeys = state.keys.filter((k) => k.status === 'active');
  const revokedKeys = state.keys.filter((k) => k.status === 'revoked' || k.status === 'expired');

  return {
    keys: state.keys,
    activeKeys,
    revokedKeys,
    newKeySecret: state.newKeySecret,
    newKeyName: state.newKeyName,
    activity: state.activity,
    loading: state.loading,
    loadingActivity: state.loadingActivity,
    error: state.error,
    refresh,
    createKey,
    rotateKey,
    revokeKey,
    deleteKey,
    clearNewKeySecret,
    loadActivity,
    copySecret,
  };
}
