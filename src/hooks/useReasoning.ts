import { useCallback } from 'react';
import { aiStore } from '../store/ai';

export function useReasoning() {
  const state = aiStore.useStore();

  const setReasoning = useCallback((reasoning: {
    steps: string[];
    confidence: number;
    intermediateChain: string[];
    finalConclusion: string;
  }) => {
    aiStore.setReasoning(reasoning);
  }, []);

  return {
    reasoningSteps: state.reasoningSteps,
    confidence: state.confidence,
    intermediateChain: state.intermediateChain,
    finalConclusion: state.finalConclusion,
    setReasoning,
  };
}
