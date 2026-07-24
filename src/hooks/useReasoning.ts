import { useCallback } from 'react';
import { aiStore } from '../store/ai';

export function useReasoning() {
  const state = aiStore.useStore();

  const setReasoning = useCallback((reasoning: {
    steps: string[];
    confidence: number;
    intermediateChain: string[];
    finalConclusion: string;
    atreTrace?: any[];
    atreHypotheses?: any[];
    atreRecommendations?: any[];
    atreAttackChain?: any;
    atreConfidenceBreakdown?: any;
  }) => {
    aiStore.setReasoning(reasoning);
  }, []);

  const setSelectedTraceSessionId = useCallback((id: string | null) => {
    aiStore.setSelectedTraceSessionId(id);
  }, []);

  const setActiveTraceDetail = useCallback((detail: any | null) => {
    aiStore.setActiveTraceDetail(detail);
  }, []);

  const setSelectedStepIndex = useCallback((idx: number | null) => {
    aiStore.setSelectedStepIndex(idx);
  }, []);

  const cacheTraceSession = useCallback((sessionId: string, traceData: any) => {
    aiStore.cacheTraceSession(sessionId, traceData);
  }, []);

  const setHistorySessions = useCallback((history: any[]) => {
    aiStore.setHistorySessions(history);
  }, []);

  return {
    reasoningSteps: state.reasoningSteps,
    confidence: state.confidence,
    intermediateChain: state.intermediateChain,
    finalConclusion: state.finalConclusion,
    atreTrace: state.atreTrace,
    atreHypotheses: state.atreHypotheses,
    atreRecommendations: state.atreRecommendations,
    atreAttackChain: state.atreAttackChain,
    atreConfidenceBreakdown: state.atreConfidenceBreakdown,
    selectedTraceSessionId: state.selectedTraceSessionId,
    activeTraceDetail: state.activeTraceDetail,
    selectedStepIndex: state.selectedStepIndex,
    traceCache: state.traceCache,
    historySessions: state.historySessions,
    setReasoning,
    setSelectedTraceSessionId,
    setActiveTraceDetail,
    setSelectedStepIndex,
    cacheTraceSession,
    setHistorySessions,
  };
}
