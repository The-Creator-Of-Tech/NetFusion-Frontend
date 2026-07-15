import { useCallback } from 'react';
import { aiStore } from '../store/ai';

export function useMemory() {
  const state = aiStore.useStore();

  const addMemory = useCallback((content: string, type: 'long-term' | 'recent' = 'recent') => {
    aiStore.addMemoryEntry(content, type);
  }, []);

  const removeMemory = useCallback((id: string) => {
    aiStore.removeMemoryEntry(id);
  }, []);

  const searchMemory = useCallback((query: string) => {
    aiStore.setSearchQuery(query);
  }, []);

  const clearMemory = useCallback(() => {
    aiStore.setMemoryEntries([]);
  }, []);

  // Filtered memory entries based on search query
  const filteredEntries = state.memoryEntries.filter(entry => {
    if (!state.searchQuery) return true;
    return entry.content.toLowerCase().includes(state.searchQuery.toLowerCase());
  });

  return {
    memoryEntries: filteredEntries,
    allMemoryEntries: state.memoryEntries,
    longTermMemory: state.longTermMemory,
    recentMemory: state.recentMemory,
    searchQuery: state.searchQuery,
    addMemory,
    removeMemory,
    searchMemory,
    clearMemory,
  };
}
