import { useCallback } from 'react';
import { aiStore } from '../store/ai';

export function useProviders() {
  const state = aiStore.useStore();

  const switchProvider = useCallback((providerName: string) => {
    aiStore.switchProvider(providerName);
  }, []);

  const switchModel = useCallback((modelName: string) => {
    aiStore.switchModel(modelName);
  }, []);

  const setProviderStatus = useCallback((providerName: string, status: 'online' | 'offline' | 'degraded') => {
    aiStore.setProviderStatus(providerName, status);
  }, []);

  const setPerformanceMetrics = useCallback((
    latency: number | null,
    cost: number | null,
    tokens: { prompt: number; completion: number; total: number } | null
  ) => {
    aiStore.setPerformanceMetrics(latency, cost, tokens);
  }, []);

  return {
    providers: state.providers,
    activeProvider: state.activeProvider,
    activeModel: state.activeModel,
    providerStatus: state.providerStatus,
    latency: state.latency,
    cost: state.cost,
    tokens: state.tokens,
    switchProvider,
    switchModel,
    setProviderStatus,
    setPerformanceMetrics,
  };
}
