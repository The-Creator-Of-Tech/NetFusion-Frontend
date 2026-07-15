/**
 * hooks/useTags.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for Tags within a project.
 * Supports create, assign, unassign, delete, debounced search.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { tagsStore } from '../store/tags';
import { debounce } from '../lib/debounce';
import type { CreateTagRequest } from '../types/shared';

export function useTags(projectId: string) {
  const state = tagsStore.useStore();
  const [searchInput, setSearchInputRaw] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!projectId) return;
    abortRef.current = new AbortController();
    tagsStore.loadTags(projectId);
    return () => {
      abortRef.current?.abort();
    };
  }, [projectId]);

  // ─── Debounced search (400 ms) ─────────────────────────────────────────────
  const debouncedSearch = useRef(
    debounce((q: string) => {
      tagsStore.searchTags(projectId, q);
    }, 400),
  ).current;

  const setSearchInput = useCallback(
    (q: string) => {
      setSearchInputRaw(q);
      debouncedSearch(q);
    },
    [debouncedSearch],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const refresh = useCallback(() => tagsStore.loadTags(projectId, true), [projectId]);
  const createTag = useCallback(
    (payload: CreateTagRequest) => tagsStore.createTag(projectId, payload),
    [projectId],
  );
  const assignTag = useCallback(
    (tagId: string, entityType: string, entityId: string) =>
      tagsStore.assignTag(projectId, { tagId, entityType, entityId }),
    [projectId],
  );
  const unassignTag = useCallback(
    (tagId: string, entityType: string, entityId: string) =>
      tagsStore.unassignTag(projectId, tagId, entityType, entityId),
    [projectId],
  );
  const deleteTag = useCallback(
    (tagId: string) => tagsStore.deleteTag(projectId, tagId),
    [projectId],
  );

  return {
    tags: tagsStore.getTags(projectId),
    searchResults: state.searchResults,
    searchInput,
    setSearchInput,
    loading: tagsStore.isLoading(projectId),
    error: tagsStore.getError(projectId),
    refresh,
    createTag,
    assignTag,
    unassignTag,
    deleteTag,
  };
}
