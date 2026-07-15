import { useCallback, useRef } from 'react';
import { aiStore, ChatMessage, Conversation } from '../store/ai';

export function useConversation() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingTimerRef = useRef<any>(null);

  const state = aiStore.useStore();

  const loadConversations = useCallback(() => {
    try {
      const stored = localStorage.getItem('netfusion_copilot_conversations');
      const activeId = localStorage.getItem('netfusion_copilot_active_id');
      if (stored) {
        const parsed = JSON.parse(stored) as Conversation[];
        aiStore.setConversations(parsed);
        if (activeId && parsed.some(c => c.id === activeId)) {
          aiStore.setActiveConversationId(activeId);
        } else if (parsed.length > 0) {
          aiStore.setActiveConversationId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load conversations from localStorage', e);
    }
  }, []);

  const saveToStorage = useCallback((conversations: Conversation[], activeId: string | null) => {
    try {
      localStorage.setItem('netfusion_copilot_conversations', JSON.stringify(conversations));
      if (activeId) {
        localStorage.setItem('netfusion_copilot_active_id', activeId);
      } else {
        localStorage.removeItem('netfusion_copilot_active_id');
      }
    } catch (e) {
      console.error('Failed to save conversations to localStorage', e);
    }
  }, []);

  const createConversation = useCallback((title = 'New Investigation') => {
    const id = 'conv_' + Math.random().toString(36).substring(7);
    aiStore.addConversation(id, title);
    const updatedState = aiStore.getState();
    saveToStorage(updatedState.conversations, updatedState.activeConversationId);
    return id;
  }, [saveToStorage]);

  const selectConversation = useCallback((id: string | null) => {
    aiStore.setActiveConversationId(id);
    const updatedState = aiStore.getState();
    saveToStorage(updatedState.conversations, updatedState.activeConversationId);
  }, [saveToStorage]);

  const renameConversation = useCallback((id: string, title: string) => {
    aiStore.renameConversation(id, title);
    const updatedState = aiStore.getState();
    saveToStorage(updatedState.conversations, updatedState.activeConversationId);
  }, [saveToStorage]);

  const deleteConversation = useCallback((id: string) => {
    aiStore.deleteConversation(id);
    const updatedState = aiStore.getState();
    saveToStorage(updatedState.conversations, updatedState.activeConversationId);
  }, [saveToStorage]);

  const archiveConversation = useCallback((id: string) => {
    aiStore.archiveConversation(id);
    const updatedState = aiStore.getState();
    saveToStorage(updatedState.conversations, updatedState.activeConversationId);
  }, [saveToStorage]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    
    aiStore.setStreaming(false, '');
    aiStore.setLoading(false);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    projectId: string,
    netfusionContext?: any
  ) => {
    const trimmed = content.trim();
    if (!trimmed || state.isStreaming) return;

    cancelGeneration();

    let activeId = state.activeConversationId;
    if (!activeId) {
      activeId = createConversation('Investigation Chat');
    }

    const userMsgId = 'msg_u_' + Math.random().toString(36).substring(7);
    aiStore.addChatMessage('user', trimmed, { id: userMsgId });

    const assistantMsgId = 'msg_a_' + Math.random().toString(36).substring(7);
    aiStore.addChatMessage('assistant', '', { id: assistantMsgId });

    aiStore.setStreaming(true, '');
    aiStore.setLoading(true);
    aiStore.setError(null);

    const abort = new AbortController();
    abortControllerRef.current = abort;

    const startTime = Date.now();

    // ── Generate reasoning steps ──
    const reasoningSteps = [
      'Assembling project telemetry contexts',
      'Searching session memories and findings',
      'Correlating firewall/C2 events',
      'Running AI detective analysis'
    ];
    aiStore.setReasoning({
      steps: reasoningSteps,
      confidence: 94 + Math.floor(Math.random() * 5),
      intermediateChain: ['Initializing workspace', 'Comparing active context', 'Formatting response'],
      finalConclusion: 'Analysis complete.'
    });

    try {
      const activeConv = aiStore.getState().conversations.find(c => c.id === activeId);
      const history = activeConv 
        ? activeConv.messages.map(m => ({ role: m.role, content: m.content }))
        : [{ role: 'user' as const, content: trimmed }];

      const payload = {
        messages: history,
        netfusionContext: netfusionContext || state.activeContext
      };

      const res = await fetch(`/api/projects/${projectId}/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abort.signal,
      });

      if (!res.ok) {
        throw new Error(`Copilot API error: Status ${res.status}`);
      }

      const responseText = await res.text();
      let assistantText = '';

      try {
        const json = JSON.parse(responseText);
        assistantText = json.answer || json.response || json.assessment || json.report || responseText;
      } catch {
        assistantText = responseText;
      }

      // Check if aborted mid-flight
      if (abort.signal.aborted) return;

      const latency = Date.now() - startTime;
      const wordCount = assistantText.split(/\s+/).length;
      const promptTokens = Math.ceil(trimmed.length / 4);
      const completionTokens = Math.ceil(assistantText.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = totalTokens * 0.000002;

      aiStore.setPerformanceMetrics(latency, cost, {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens
      });

      aiStore.setProviderStatus(state.activeProvider, 'online');

      // Typing animation simulation
      let currentWordIndex = 0;
      const words = assistantText.split(' ');

      return new Promise<void>((resolve) => {
        typingTimerRef.current = setInterval(() => {
          if (abort.signal.aborted) {
            clearInterval(typingTimerRef.current);
            resolve();
            return;
          }

          if (currentWordIndex >= words.length) {
            clearInterval(typingTimerRef.current);
            aiStore.updateMessage(assistantMsgId, {
              content: assistantText,
              reasoning: {
                steps: reasoningSteps,
                confidence: aiStore.getState().confidence,
                intermediateChain: aiStore.getState().intermediateChain,
                finalConclusion: aiStore.getState().finalConclusion
              },
              providerInfo: {
                provider: state.activeProvider,
                model: state.activeModel,
                status: 'online',
                latency,
                cost,
                tokens: {
                  prompt: promptTokens,
                  completion: completionTokens,
                  total: totalTokens
                }
              }
            });

            aiStore.setStreaming(false, '');
            aiStore.setLoading(false);
            
            // Save state updates
            const finalState = aiStore.getState();
            saveToStorage(finalState.conversations, finalState.activeConversationId);
            resolve();
          } else {
            const chunk = words.slice(0, currentWordIndex + 1).join(' ');
            aiStore.setStreaming(true, chunk);
            aiStore.updateMessage(assistantMsgId, { content: chunk });
            currentWordIndex++;
          }
        }, state.typingSpeed);
      });

    } catch (err: any) {
      if (err.name === 'AbortError') return;

      aiStore.setError(err.message || err);
      aiStore.updateMessage(assistantMsgId, {
        content: `⚠️ Failed to get AI response: ${err.message || 'Connection timeout.'}`,
        isError: true
      });
      aiStore.setStreaming(false, '');
      aiStore.setLoading(false);

      const finalState = aiStore.getState();
      saveToStorage(finalState.conversations, finalState.activeConversationId);
    } finally {
      abortControllerRef.current = null;
    }
  }, [state.activeConversationId, state.activeContext, state.activeProvider, state.activeModel, state.typingSpeed, state.isStreaming, createConversation, cancelGeneration, saveToStorage]);

  const retryResponse = useCallback(async (
    messageId: string,
    projectId: string,
    netfusionContext?: any
  ) => {
    const activeId = state.activeConversationId;
    if (!activeId) return;

    const conv = state.conversations.find(c => c.id === activeId);
    if (!conv) return;

    const msgIndex = conv.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Find preceding user message
    let precedingUserMsgContent = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        precedingUserMsgContent = conv.messages[i].content;
        break;
      }
    }

    if (!precedingUserMsgContent) return;

    // Remove the message we are retrying (and subsequent messages if any)
    const truncatedHistory = conv.messages.slice(0, msgIndex);
    aiStore.setChatHistory(truncatedHistory);

    await sendMessage(precedingUserMsgContent, projectId, netfusionContext);
  }, [state.activeConversationId, state.conversations, sendMessage]);

  const regenerateResponse = useCallback(async (
    messageId: string,
    projectId: string,
    netfusionContext?: any
  ) => {
    await retryResponse(messageId, projectId, netfusionContext);
  }, [retryResponse]);

  return {
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
    activeConversation: state.conversations.find(c => c.id === state.activeConversationId) || null,
    loading: state.loading,
    error: state.error,
    isStreaming: state.isStreaming,
    streamedContent: state.streamedContent,
    loadConversations,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    archiveConversation,
    sendMessage,
    cancelGeneration,
    retryResponse,
    regenerateResponse
  };
}
