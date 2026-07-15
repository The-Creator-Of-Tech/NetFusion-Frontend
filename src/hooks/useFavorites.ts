/**
 * hooks/useFavorites.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for Favorites.
 * Supports add, remove, toggle, list, filter by type.
 * Fully optimistic — UI updates before API responds.
 */

import { useEffect, useCallback } from 'react';
import { favoritesStore } from '../store/favorites';
import type { FavoriteEntityType, AddFavoriteRequest } from '../types/shared';

export function useFavorites(userId: string) {
  const state = favoritesStore.useStore();

  useEffect(() => {
    if (userId) favoritesStore.loadFavorites(userId);
  }, [userId]);

  const refresh = useCallback(
    () => favoritesStore.loadFavorites(userId, true),
    [userId],
  );

  const addFavorite = useCallback(
    (payload: AddFavoriteRequest) => favoritesStore.addFavorite(payload),
    [],
  );

  const removeFavorite = useCallback(
    (favoriteId: string) => favoritesStore.removeFavorite(favoriteId),
    [],
  );

  const toggleFavorite = useCallback(
    (entityType: FavoriteEntityType, entityId: string, entityName?: string) =>
      favoritesStore.toggleFavorite(entityType, entityId, entityName),
    [],
  );

  const isFavorite = useCallback(
    (entityType: FavoriteEntityType, entityId: string) =>
      favoritesStore.isFavorite(entityType, entityId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.favorites],
  );

  const getByType = useCallback(
    (entityType: FavoriteEntityType) => favoritesStore.getByType(entityType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.favorites],
  );

  return {
    favorites: state.favorites,
    loading: state.loading,
    error: state.error,
    refresh,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getByType,
  };
}
