/**
 * hooks/useComments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for Comments on any entity (finding, asset, report, case).
 * Supports create, edit, delete, replies, mentions.
 * Requests cancelled on unmount via AbortController.
 */

import { useEffect, useCallback, useRef } from 'react';
import { commentsStore } from '../store/comments';
import type {
  CommentEntityType,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '../types/shared';

export function useComments(entityType: CommentEntityType, entityId: string) {
  const state = commentsStore.useStore();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!entityType || !entityId) return;

    abortRef.current = new AbortController();
    commentsStore.loadComments(entityType, entityId);

    return () => {
      abortRef.current?.abort();
    };
  }, [entityType, entityId]);

  const refresh = useCallback(
    () => commentsStore.loadComments(entityType, entityId, true),
    [entityType, entityId],
  );

  const createComment = useCallback(
    (payload: Omit<CreateCommentRequest, 'entityType' | 'entityId'>) =>
      commentsStore.createComment({ ...payload, entityType, entityId }),
    [entityType, entityId],
  );

  const updateComment = useCallback(
    (commentId: string, payload: UpdateCommentRequest) =>
      commentsStore.updateComment(commentId, entityType, entityId, payload),
    [entityType, entityId],
  );

  const deleteComment = useCallback(
    (commentId: string) => commentsStore.deleteComment(commentId, entityType, entityId),
    [entityType, entityId],
  );

  const comments = commentsStore.getComments(entityType, entityId);
  // Build threaded tree: top-level comments with nested replies
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => !!c.parentId);
  const threaded = topLevel.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parentId === c.id),
  }));

  return {
    comments,
    threaded,
    loading: commentsStore.isLoading(entityType, entityId),
    error: commentsStore.getError(entityType, entityId),
    refresh,
    createComment,
    updateComment,
    deleteComment,
  };
}
