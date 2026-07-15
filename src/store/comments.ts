/**
 * store/comments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Comments store for Phase A6.8.
 * Supports: create, edit, delete, replies, mentions, attachments.
 * Keyed by entityType+entityId so multiple entities can have cached comments.
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import { optimisticUpdate, optimisticAdd, optimisticPatch, optimisticRemove } from '../api/optimistic';
import type {
  Comment,
  CommentEntityType,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '../types/shared';

// ─── State ────────────────────────────────────────────────────────────────────

export interface CommentsState {
  /** comments keyed by `${entityType}:${entityId}` */
  byEntity: Record<string, Comment[]>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
}

const initialState: CommentsState = {
  byEntity: {},
  loading: {},
  error: {},
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class CommentsStore extends Store<CommentsState> {
  constructor() {
    super(initialState);
  }

  private entityKey(entityType: string, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  private setLoading(key: string, value: boolean): void {
    this.setState((s) => ({ loading: { ...s.loading, [key]: value } }));
  }

  private setError(key: string, msg: string | null): void {
    this.setState((s) => ({ error: { ...s.error, [key]: msg } }));
  }

  getComments(entityType: string, entityId: string): Comment[] {
    return this.getState().byEntity[this.entityKey(entityType, entityId)] ?? [];
  }

  isLoading(entityType: string, entityId: string): boolean {
    return this.getState().loading[this.entityKey(entityType, entityId)] ?? false;
  }

  getError(entityType: string, entityId: string): string | null {
    return this.getState().error[this.entityKey(entityType, entityId)] ?? null;
  }

  // ─── Async: Load ────────────────────────────────────────────────────────────

  async loadComments(
    entityType: CommentEntityType,
    entityId: string,
    forceRefresh = false,
  ): Promise<void> {
    const key = this.entityKey(entityType, entityId);
    const cacheKey = CacheKeys.comments(entityType, entityId);

    if (!forceRefresh) {
      const cached = responseCache.get<{ comments: Comment[] }>(cacheKey);
      if (cached) {
        this.setState((s) => ({
          byEntity: { ...s.byEntity, [key]: cached.comments ?? [] },
        }));
        return;
      }
    }

    this.setLoading(key, true);
    this.setError(key, null);

    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ comments: Comment[] }>(Endpoints.comments.list(entityType, entityId)),
      );
      const TTL_COMMENTS = 30_000;
      responseCache.set(cacheKey, res, TTL_COMMENTS);
      this.setState((s) => ({
        byEntity: { ...s.byEntity, [key]: res.comments ?? [] },
      }));
    } catch (err: unknown) {
      this.setError(key, err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      this.setLoading(key, false);
    }
  }

  // ─── Async: Create (optimistic) ─────────────────────────────────────────────

  async createComment(payload: CreateCommentRequest): Promise<Comment> {
    const key = this.entityKey(payload.entityType, payload.entityId);
    const optimisticId = `optimistic-${Date.now()}`;

    const optimisticComment: Comment = {
      id: optimisticId,
      content: payload.content,
      entityType: payload.entityType,
      entityId: payload.entityId,
      projectId: '',
      author: { id: 'me', name: 'You' },
      parentId: payload.parentId ?? null,
      mentions: payload.mentions ?? [],
      attachments: [],
      edited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let created: Comment = optimisticComment;

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          byEntity: {
            ...s.byEntity,
            [key]: [...(s.byEntity[key] ?? []), optimisticComment],
          },
        }));
      },
      rollback: () => {
        this.setState((s) => ({
          byEntity: {
            ...s.byEntity,
            [key]: (s.byEntity[key] ?? []).filter((c) => c.id !== optimisticId),
          },
        }));
      },
      commit: async () => {
        const res = await request.post<{ comment: Comment }>(
          Endpoints.comments.create(),
          payload,
        );
        created = res.comment;
        return res;
      },
      confirm: (res) => {
        // Replace optimistic with real
        this.setState((s) => ({
          byEntity: {
            ...s.byEntity,
            [key]: (s.byEntity[key] ?? []).map((c) =>
              c.id === optimisticId ? res.comment : c,
            ),
          },
        }));
      },
    });

    responseCache.invalidate(CacheKeys.comments(payload.entityType, payload.entityId));
    return created;
  }

  // ─── Async: Update (optimistic) ─────────────────────────────────────────────

  async updateComment(
    commentId: string,
    entityType: CommentEntityType,
    entityId: string,
    payload: UpdateCommentRequest,
  ): Promise<void> {
    const key = this.entityKey(entityType, entityId);
    const prev = [...(this.getState().byEntity[key] ?? [])];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          byEntity: {
            ...s.byEntity,
            [key]: optimisticPatch(s.byEntity[key] ?? [], commentId, {
              content: payload.content,
              edited: true,
              editedAt: new Date().toISOString(),
            }),
          },
        }));
      },
      rollback: () => {
        this.setState((s) => ({
          byEntity: { ...s.byEntity, [key]: prev },
        }));
      },
      commit: () =>
        request.patch<void>(Endpoints.comments.update(commentId), payload),
    });

    responseCache.invalidate(CacheKeys.comments(entityType, entityId));
  }

  // ─── Async: Delete (optimistic) ─────────────────────────────────────────────

  async deleteComment(
    commentId: string,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<void> {
    const key = this.entityKey(entityType, entityId);
    const prev = [...(this.getState().byEntity[key] ?? [])];

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          byEntity: {
            ...s.byEntity,
            [key]: optimisticRemove(s.byEntity[key] ?? [], commentId),
          },
        }));
      },
      rollback: () => {
        this.setState((s) => ({
          byEntity: { ...s.byEntity, [key]: prev },
        }));
      },
      commit: () =>
        request.delete<void>(Endpoints.comments.delete(commentId)),
    });

    responseCache.invalidate(CacheKeys.comments(entityType, entityId));
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const commentsStore = new CommentsStore();
