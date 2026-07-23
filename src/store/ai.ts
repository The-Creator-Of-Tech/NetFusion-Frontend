import { Store } from './base';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoning?: {
    steps: string[];
    confidence: number;
    intermediateChain: string[];
    finalConclusion: string;
  };
  providerInfo?: {
    provider: string;
    model: string;
    status: 'online' | 'offline' | 'degraded';
    latency: number;
    cost: number;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  type: 'long-term' | 'recent';
  createdAt: string;
}

export interface Provider {
  name: string;
  model: string;
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  cost: number;
}

export interface AiState {
  // ── Backwards Compatibility ──
  chatHistory: ChatMessage[];
  activeRecommendation: any | null;
  generatedAttackStory: any | null;
  generatedInvestigationPlan: any | null;
  loading: boolean;
  error: any | null;

  // ── Conversation ──
  conversations: Conversation[];
  activeConversationId: string | null;

  // ── Streaming ──
  isStreaming: boolean;
  streamedContent: string;
  typingSpeed: number;

  // ── Context ──
  activeContext: any | null;
  contextSize: number;
  attachedInvestigation: string | null;
  attachedFindings: string[];
  attachedAssets: string[];

  // ── Memory ──
  memoryEntries: MemoryEntry[];
  longTermMemory: string[];
  recentMemory: string[];
  searchQuery: string;

  // ── Reasoning (ATRE Integrated) ──
  reasoningSteps: string[];
  confidence: number;
  intermediateChain: string[];
  finalConclusion: string;
  atreTrace: any[] | null;
  atreHypotheses: any[] | null;
  atreRecommendations: any[] | null;
  atreAttackChain: any | null;
  atreConfidenceBreakdown: any | null;
  selectedTraceSessionId: string | null;
  activeTraceDetail: any | null;
  selectedStepIndex: number | null;
  traceCache: Record<string, any>;
  historySessions: any[];

  // ── Providers ──
  providers: Provider[];
  activeProvider: string;
  activeModel: string;
  providerStatus: Record<string, 'online' | 'offline' | 'degraded'>;
  latency: number | null;
  cost: number | null;
  tokens: { prompt: number; completion: number; total: number } | null;
}

const defaultProviders: Provider[] = [
  { name: 'ATRE Threat Engine', model: 'atre-v1-graph-reasoner', status: 'online', latency: 210, cost: 0.0001 },
  { name: 'Groq', model: 'llama-3.3-70b-versatile', status: 'online', latency: 320, cost: 0.0002 },
  { name: 'OpenAI', model: 'gpt-4o', status: 'online', latency: 450, cost: 0.005 },
  { name: 'Anthropic', model: 'claude-3-5-sonnet', status: 'online', latency: 680, cost: 0.015 }
];

const initialState: AiState = {
  chatHistory: [],
  activeRecommendation: null,
  generatedAttackStory: null,
  generatedInvestigationPlan: null,
  loading: false,
  error: null,

  conversations: [],
  activeConversationId: null,

  isStreaming: false,
  streamedContent: '',
  typingSpeed: 25,

  activeContext: null,
  contextSize: 0,
  attachedInvestigation: null,
  attachedFindings: [],
  attachedAssets: [],

  memoryEntries: [],
  longTermMemory: [],
  recentMemory: [],
  searchQuery: '',

  reasoningSteps: [],
  confidence: 95,
  intermediateChain: [],
  finalConclusion: '',
  atreTrace: null,
  atreHypotheses: null,
  atreRecommendations: null,
  atreAttackChain: null,
  atreConfidenceBreakdown: null,
  selectedTraceSessionId: null,
  activeTraceDetail: null,
  selectedStepIndex: null,
  traceCache: {},
  historySessions: [],

  providers: defaultProviders,
  activeProvider: 'ATRE Threat Engine',
  activeModel: 'atre-v1-graph-reasoner',
  providerStatus: { 'ATRE Threat Engine': 'online', Groq: 'online', OpenAI: 'online', Anthropic: 'online' },
  latency: null,
  cost: null,
  tokens: null,
};

export class AiStore extends Store<AiState> {
  constructor() {
    super(initialState);
  }

  // ─── Conversations ───

  setConversations(conversations: Conversation[]): void {
    this.setState((state) => {
      let activeHistory = state.chatHistory;
      if (state.activeConversationId) {
        const active = conversations.find(c => c.id === state.activeConversationId);
        if (active) {
          activeHistory = active.messages;
        }
      }
      return { conversations, chatHistory: activeHistory };
    });
  }

  setActiveConversationId(activeConversationId: string | null): void {
    this.setState((state) => {
      const active = state.conversations.find(c => c.id === activeConversationId);
      return {
        activeConversationId,
        chatHistory: active ? active.messages : [],
      };
    });
  }

  addConversation(id: string, title: string, status: 'active' | 'archived' = 'active'): void {
    this.setState((state) => {
      const newConv: Conversation = {
        id,
        title,
        messages: [],
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        conversations: [...state.conversations, newConv],
        activeConversationId: state.activeConversationId || id,
        chatHistory: state.activeConversationId ? state.chatHistory : []
      };
    });
  }

  renameConversation(id: string, title: string): void {
    this.setState((state) => {
      const conversations = state.conversations.map(c => 
        c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
      );
      return { conversations };
    });
  }

  deleteConversation(id: string): void {
    this.setState((state) => {
      const conversations = state.conversations.filter(c => c.id !== id);
      let nextActiveId = state.activeConversationId;
      if (nextActiveId === id) {
        nextActiveId = conversations.length > 0 ? conversations[0].id : null;
      }
      const active = conversations.find(c => c.id === nextActiveId);
      return {
        conversations,
        activeConversationId: nextActiveId,
        chatHistory: active ? active.messages : []
      };
    });
  }

  archiveConversation(id: string): void {
    this.setState((state) => {
      const conversations = state.conversations.map(c => 
        c.id === id ? { ...c, status: 'archived' as const, updatedAt: new Date().toISOString() } : c
      );
      return { conversations };
    });
  }

  // ─── Messages ───

  setChatHistory(chatHistory: ChatMessage[]): void {
    this.setState((state) => {
      const conversations = state.conversations.map(c => 
        c.id === state.activeConversationId 
          ? { ...c, messages: chatHistory, updatedAt: new Date().toISOString() } 
          : c
      );
      return { chatHistory, conversations };
    });
  }

  addChatMessage(role: 'user' | 'assistant', content: string, extra?: Partial<ChatMessage>): void {
    this.setState((state) => {
      const newMsg: ChatMessage = {
        id: extra?.id || Math.random().toString(36).substring(7),
        role,
        content,
        timestamp: new Date().toISOString(),
        ...extra
      };

      const updatedHistory = [...state.chatHistory, newMsg];
      
      const conversations = state.conversations.map(c => 
        c.id === state.activeConversationId 
          ? { ...c, messages: updatedHistory, updatedAt: new Date().toISOString() } 
          : c
      );

      return {
        chatHistory: updatedHistory,
        conversations
      };
    });
  }

  updateMessage(messageId: string, updates: Partial<ChatMessage>): void {
    this.setState((state) => {
      const updatedHistory = state.chatHistory.map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      );

      const conversations = state.conversations.map(c => 
        c.id === state.activeConversationId 
          ? { ...c, messages: updatedHistory, updatedAt: new Date().toISOString() } 
          : c
      );

      return {
        chatHistory: updatedHistory,
        conversations
      };
    });
  }

  // ─── Streaming ───

  setStreaming(isStreaming: boolean, streamedContent = ''): void {
    this.setState({ isStreaming, streamedContent });
  }

  setTypingSpeed(typingSpeed: number): void {
    this.setState({ typingSpeed });
  }

  // ─── Context ───

  setActiveContext(activeContext: any | null): void {
    this.setState({ activeContext });
    this.recalculateContextSize();
  }

  attachAsset(assetId: string): void {
    this.setState((state) => {
      if (state.attachedAssets.includes(assetId)) return {};
      return { attachedAssets: [...state.attachedAssets, assetId] };
    });
    this.recalculateContextSize();
  }

  detachAsset(assetId: string): void {
    this.setState((state) => ({
      attachedAssets: state.attachedAssets.filter(id => id !== assetId)
    }));
    this.recalculateContextSize();
  }

  attachFinding(findingId: string): void {
    this.setState((state) => {
      if (state.attachedFindings.includes(findingId)) return {};
      return { attachedFindings: [...state.attachedFindings, findingId] };
    });
    this.recalculateContextSize();
  }

  detachFinding(findingId: string): void {
    this.setState((state) => ({
      attachedFindings: state.attachedFindings.filter(id => id !== findingId)
    }));
    this.recalculateContextSize();
  }

  setAttachedInvestigation(projectId: string | null): void {
    this.setState({ attachedInvestigation: projectId });
    this.recalculateContextSize();
  }

  private recalculateContextSize(): void {
    this.setState((state) => {
      let size = 0;
      if (state.activeContext) {
        size += JSON.stringify(state.activeContext).length;
      }
      if (state.attachedInvestigation) {
        size += state.attachedInvestigation.length * 10;
      }
      size += state.attachedAssets.length * 15;
      size += state.attachedFindings.length * 15;
      return { contextSize: size };
    });
  }

  // ─── Memory ───

  setMemoryEntries(memoryEntries: MemoryEntry[]): void {
    this.setState({
      memoryEntries,
      longTermMemory: memoryEntries.filter(e => e.type === 'long-term').map(e => e.content),
      recentMemory: memoryEntries.filter(e => e.type === 'recent').map(e => e.content)
    });
  }

  addMemoryEntry(content: string, type: 'long-term' | 'recent'): void {
    this.setState((state) => {
      const entry: MemoryEntry = {
        id: Math.random().toString(36).substring(7),
        content,
        type,
        createdAt: new Date().toISOString()
      };
      const entries = [...state.memoryEntries, entry];
      return {
        memoryEntries: entries,
        longTermMemory: entries.filter(e => e.type === 'long-term').map(e => e.content),
        recentMemory: entries.filter(e => e.type === 'recent').map(e => e.content)
      };
    });
  }

  removeMemoryEntry(id: string): void {
    this.setState((state) => {
      const entries = state.memoryEntries.filter(e => e.id !== id);
      return {
        memoryEntries: entries,
        longTermMemory: entries.filter(e => e.type === 'long-term').map(e => e.content),
        recentMemory: entries.filter(e => e.type === 'recent').map(e => e.content)
      };
    });
  }

  setSearchQuery(searchQuery: string): void {
    this.setState({ searchQuery });
  }

  // ─── ATRE Reasoning Integration ───

  setReasoning(reasoning: {
    steps: string[];
    confidence: number;
    intermediateChain: string[];
    finalConclusion: string;
    atreTrace?: any[];
    atreHypotheses?: any[];
    atreRecommendations?: any[];
    atreAttackChain?: any;
    atreConfidenceBreakdown?: any;
  }): void {
    this.setState({
      reasoningSteps: reasoning.steps,
      confidence: reasoning.confidence,
      intermediateChain: reasoning.intermediateChain,
      finalConclusion: reasoning.finalConclusion,
      atreTrace: reasoning.atreTrace ?? null,
      atreHypotheses: reasoning.atreHypotheses ?? null,
      atreRecommendations: reasoning.atreRecommendations ?? null,
      atreAttackChain: reasoning.atreAttackChain ?? null,
      atreConfidenceBreakdown: reasoning.atreConfidenceBreakdown ?? null,
    });
  }

  setSelectedTraceSessionId(sessionId: string | null): void {
    this.setState({ selectedTraceSessionId: sessionId });
  }

  setActiveTraceDetail(traceDetail: any | null): void {
    this.setState({ activeTraceDetail: traceDetail });
  }

  setSelectedStepIndex(index: number | null): void {
    this.setState({ selectedStepIndex: index });
  }

  cacheTraceSession(sessionId: string, traceData: any): void {
    this.setState((state) => ({
      traceCache: {
        ...state.traceCache,
        [sessionId]: traceData,
      },
    }));
  }

  setHistorySessions(historySessions: any[]): void {
    this.setState({ historySessions });
  }

  // ─── Providers ───

  switchProvider(providerName: string): void {
    this.setState((state) => {
      const found = state.providers.find(p => p.name === providerName);
      if (!found) return {};
      return {
        activeProvider: providerName,
        activeModel: found.model
      };
    });
  }

  switchModel(modelName: string): void {
    this.setState({ activeModel: modelName });
  }

  setProviderStatus(providerName: string, status: 'online' | 'offline' | 'degraded'): void {
    this.setState((state) => {
      const providers = state.providers.map(p => 
        p.name === providerName ? { ...p, status } : p
      );
      const statusMap = { ...state.providerStatus, [providerName]: status };
      return { providers, providerStatus: statusMap };
    });
  }

  setPerformanceMetrics(latency: number | null, cost: number | null, tokens: { prompt: number; completion: number; total: number } | null): void {
    this.setState({ latency, cost, tokens });
  }

  // ─── Core & Compatibility ───

  setActiveRecommendation(activeRecommendation: any | null): void {
    this.setState({ activeRecommendation });
  }

  setGeneratedAttackStory(generatedAttackStory: any | null): void {
    this.setState({ generatedAttackStory });
  }

  setGeneratedInvestigationPlan(generatedInvestigationPlan: any | null): void {
    this.setState({ generatedInvestigationPlan });
  }

  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  setError(error: any): void {
    this.setState({ error });
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const aiStore = new AiStore();
