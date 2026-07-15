/**
 * store/tags.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tags store for Phase A6.8.
 * Supports: create, assign, remove, search.
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, TTL, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import { optimisticUpdate, optimisticRemove, optimisticAdd } from '../api/optimistic';
import type { Tag, CreateTagRequest, AssignTagRequest } from '../types/shared';

// ─── State ────────────────────────────────────────────────────────────────────

export interface TagsState {
  byProject: Record<string, Tag[]>;
  searchResults: Tag[];
  searchQuery: string;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
}

const initialState: TagsState = {
  byProject: {},
  searchResults: [],
  searchQuery: '',
  loading: {},
  error: {},
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class TagsStore extends Store<TagsState> {
  constructor() {
    super(initialState);
  }

  getTags(projectId: string): Tag[] {
    return this.getState().byProject[projectId] ?? [];
  }

  isLoading(projectId: string): boolean {
    return this.getState().loading[projectId] ?? false;
  }

  getError(projectId: string): string | null {
    return this.getState().error[projectId] ?? null;
  }

  private setLoading(projectId: string, value: boolean): void {
    this.setState((s) => ({ loading: { ...s.loading, [projectId]: value } }));
  }

  private setError(projectId: string, msg: string | null): void {
    this.setState((s) => ({ error: { ...s.error, [projectId]: msg } }));
  }

  // ─── Async: Load ────────────────────────────────────────────────────────────

  async loadTags(projectId: string, forceRefresh = false): Promise<void> {
    const cacheKey = CacheKeys.tags(projectId);

    if (!forceRefresh) {
      const cached = responseCache.get<{ tags: Tag[] }>(cacheKey);
      if (cached) {
        this.setState((s) => ({
          byProject: { ...s.byProject, [projectId]: cached.tags ?? [] },
        }));
        return;
      }
    }

    this.setLoading(projectId, true);
    this.setError(projectId, null);

    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ tags: Tag[] }>(Endpoints.tags.list(projectId)),
      );
      responseCache.set(cacheKey, res, TTL.DEFAULT);
      this.setState((s) => ({
        byProject: { ...s.byProject, [projectId]: res.tags ?? [] },
      }));
    } catch (err: unknown) {
      this.setError(projectId, err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      this.setLoading(projectId, false);
    }
  }

  // ─── Async: Search ──────────────────────────────────────────────────────────

  async searchTags(projectId: string, query: string): Promise<void> {
    this.setState({ searchQuery: query });
    if (!query.trim()) {
      this.setState({ searchResults: [] });
      return;
    }

    try {
      const res = await request.get<{ tags: Tag[] }>(
        Endpoints.tags.search(projectId, query),
      );
      this.setState({ searchResults: res.tags ?? [] });
    } catch {
      this.setState({ searchResults: [] });
    }
  }

  // ─── Async: Create ──────────────────────────────────────────────────────────

  async createTag(projectId: string, payload: CreateTagRequest): Promise<Tag> {
    this.setError(projectId, null);
    const res = await request.post<{ tag: Tag }>(
      Endpoints.tags.create(projectId),
      payload,
    );
    const tag = res.tag;
    this.setState((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: optimisticAdd(s.byProject[projectId] ?? [], tag),
      },
    }));
    responseCache.invalidate(CacheKeys.tags(projectId));
    return tag;
  }

  // ─── Async: Assign (optimistic) ─────────────────────────────────────────────

  async assignTag(projectId: string, payload: AssignTagRequest): Promise<void> {
    // Optimistically increment usage count
    const prev = [...(this.getState().byProject[projectId] ?? [])];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: (s.byProject[projectId] ?? []).map((t) =>
              t.id === payload.tagId
                ? { ...t, usageCount: t.usageCount + 1 }
                : t,
            ),
          },
        }));
      },
      rollback: () => {
        this.setState((s) => ({
          byProject: { ...s.byProject, [projectId]: prev },
        }));
      },
      commit: () =>
        request.post<void>(Endpoints.tags.assign(projectId, payload.tagId), {
          entityType: payload.entityType,
          entityId: payload.entityId,
        }),
    });
  }

  // ─── Async: Unassign (optimistic) ───────────────────────────────────────────

  async unassignTag(projectId: string, tagId: string, entityType: string, entityId: string): Promise<void> {
    const prev = [...(this.getState().byProject[projectId] ?? [])];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: (s.byProject[projectId] ?? []).map((t) =>
              t.id === tagId
                ? { ...t, usageCount: Math.max(0, t.usageCount - 1) }
                : t,
            ),
          },
        }));
      },
      rollback: () => {
        this.setState((s) => ({
          byProject: { ...s.byProject, [projectId]: prev },
        }));
      },
      commit: () =>
        request.post<void>(Endpoints.tags.unassign(projectId, tagId), {
          entityType,
          entityId,
        }),
    });
  }

  // ─── Async: Delete (optimistic) ─────────────────────────────────────────────

  async deleteTag(projectId: string, tagId: string): Promise<void> {
    const prev = [...(this.getState().byProject[projectId] ?? [])];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: optimisticRemove(s.byProject[projectId] ?? [], tagId),
          },
        }));
      },
      rollback: () => {
        this.setState((s) => ({
          byProject: { ...s.byProject, [projectId]: prev },
        }));
      },
      commit: () => request.delete<void>(Endpoints.tags.delete(projectId, tagId)),
    });

    responseCache.invalidate(CacheKeys.tags(projectId));
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const tagsStore = new TagsStore();
