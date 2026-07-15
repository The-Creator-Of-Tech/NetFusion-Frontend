/**
 * store/favorites.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Favorites store for Phase A6.8.
 * Supports: add, remove, list. Fully optimistic.
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, TTL, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import { optimisticUpdate, optimisticRemove } from '../api/optimistic';
import type { Favorite, FavoriteEntityType, AddFavoriteRequest } from '../types/shared';

// ─── State ────────────────────────────────────────────────────────────────────

export interface FavoritesState {
  favorites: Favorite[];
  loading: boolean;
  error: string | null;
}

const initialState: FavoritesState = {
  favorites: [],
  loading: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class FavoritesStore extends Store<FavoritesState> {
  constructor() {
    super(initialState);
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  isFavorite(entityType: FavoriteEntityType, entityId: string): boolean {
    return this.getState().favorites.some(
      (f) => f.entityType === entityType && f.entityId === entityId,
    );
  }

  getFavoriteId(entityType: FavoriteEntityType, entityId: string): string | null {
    return (
      this.getState().favorites.find(
        (f) => f.entityType === entityType && f.entityId === entityId,
      )?.id ?? null
    );
  }

  getByType(entityType: FavoriteEntityType): Favorite[] {
    return this.getState().favorites.filter((f) => f.entityType === entityType);
  }

  // ─── Async: Load ────────────────────────────────────────────────────────────

  async loadFavorites(userId: string, forceRefresh = false): Promise<void> {
    const cacheKey = CacheKeys.favorites(userId);

    if (!forceRefresh) {
      const cached = responseCache.get<{ favorites: Favorite[] }>(cacheKey);
      if (cached) {
        this.setState({ favorites: cached.favorites ?? [] });
        return;
      }
    }

    this.setState({ loading: true, error: null });
    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ favorites: Favorite[] }>(Endpoints.favorites.list()),
      );
      responseCache.set(cacheKey, res, TTL.DEFAULT);
      this.setState({ favorites: res.favorites ?? [] });
    } catch (err: unknown) {
      this.setState({ error: err instanceof Error ? err.message : 'Failed to load favorites' });
    } finally {
      this.setState({ loading: false });
    }
  }

  // ─── Async: Add (optimistic) ────────────────────────────────────────────────

  async addFavorite(payload: AddFavoriteRequest): Promise<void> {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticFav: Favorite = {
      id: optimisticId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityName: payload.entityName,
      entityMeta: payload.entityMeta,
      userId: 'me',
      createdAt: new Date().toISOString(),
    };

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          favorites: [...s.favorites, optimisticFav],
        }));
      },
      rollback: () => {
        this.setState((s) => ({
          favorites: optimisticRemove(s.favorites, optimisticId),
        }));
      },
      commit: async () => {
        const res = await request.post<{ favorite: Favorite }>(
          Endpoints.favorites.add(),
          payload,
        );
        return res;
      },
      confirm: (res) => {
        // Replace optimistic with real
        this.setState((s) => ({
          favorites: s.favorites.map((f) =>
            f.id === optimisticId ? res.favorite : f,
          ),
        }));
      },
      onError: (err) => {
        this.setState({ error: err instanceof Error ? err.message : 'Failed to add favorite' });
      },
    });

    responseCache.invalidatePrefix('favorites:');
  }

  // ─── Async: Remove (optimistic) ─────────────────────────────────────────────

  async removeFavorite(favoriteId: string): Promise<void> {
    const prev = [...this.getState().favorites];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          favorites: optimisticRemove(s.favorites, favoriteId),
        }));
      },
      rollback: () => {
        this.setState({ favorites: prev });
      },
      commit: () => request.delete<void>(Endpoints.favorites.remove(favoriteId)),
      onError: (err) => {
        this.setState({ error: err instanceof Error ? err.message : 'Failed to remove favorite' });
      },
    });

    responseCache.invalidatePrefix('favorites:');
  }

  // ─── Toggle (add if not, remove if yes) ─────────────────────────────────────

  async toggleFavorite(
    entityType: FavoriteEntityType,
    entityId: string,
    entityName?: string,
  ): Promise<void> {
    const existingId = this.getFavoriteId(entityType, entityId);
    if (existingId) {
      await this.removeFavorite(existingId);
    } else {
      await this.addFavorite({ entityType, entityId, entityName });
    }
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const favoritesStore = new FavoritesStore();
