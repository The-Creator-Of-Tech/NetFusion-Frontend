import { useCallback } from 'react';
import { aiStore } from '../store/ai';

export interface UseStreamingOptions {
  onChunk?: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: any) => void;
}

export function useStreaming(options: UseStreamingOptions = {}) {
  const state = aiStore.useStore();

  const cancelGeneration = useCallback(() => {
    aiStore.setStreaming(false, '');
    aiStore.setLoading(false);
  }, []);

  const setTypingSpeed = useCallback((speed: number) => {
    aiStore.setTypingSpeed(speed);
  }, []);

  return {
    isStreaming: state.isStreaming,
    streamedContent: state.streamedContent,
    typingSpeed: state.typingSpeed,
    cancelGeneration,
    setTypingSpeed,
  };
}

