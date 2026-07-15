import { useCallback } from 'react';
import { aiStore } from '../store/ai';

export function useContext() {
  const state = aiStore.useStore();

  const attachAsset = useCallback((assetId: string) => {
    aiStore.attachAsset(assetId);
  }, []);

  const detachAsset = useCallback((assetId: string) => {
    aiStore.detachAsset(assetId);
  }, []);

  const attachFinding = useCallback((findingId: string) => {
    aiStore.attachFinding(findingId);
  }, []);

  const detachFinding = useCallback((findingId: string) => {
    aiStore.detachFinding(findingId);
  }, []);

  const setContext = useCallback((context: any) => {
    aiStore.setActiveContext(context);
  }, []);

  const setAttachedInvestigation = useCallback((projectId: string | null) => {
    aiStore.setAttachedInvestigation(projectId);
  }, []);

  return {
    activeContext: state.activeContext,
    contextSize: state.contextSize,
    attachedInvestigation: state.attachedInvestigation,
    attachedFindings: state.attachedFindings,
    attachedAssets: state.attachedAssets,
    attachAsset,
    detachAsset,
    attachFinding,
    detachFinding,
    setContext,
    setAttachedInvestigation,
  };
}
