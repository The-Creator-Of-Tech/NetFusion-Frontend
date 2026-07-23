import { Store } from './base';
import * as Types from '../types/api';
import { request, agentRequest } from '../api/request';
import { Endpoints } from '../api/endpoints';

// ─── State Shape ──────────────────────────────────────────────────────────────

export interface KnowledgeState {
  // MITRE ATT&CK
  mitreTechniques: Types.MitreTechnique[];
  selectedMitre: Types.MitreTechnique | null;

  // CVE
  cveRecords: Types.CveRecord[];
  selectedCve: Types.CveRecord | null;

  // IOC
  iocRecords: Types.IocRecord[];

  // Threat Actors
  threatActors: Types.ThreatActor[];

  // Campaigns
  campaigns: Types.Campaign[];

  // Correlation Graph
  graph: Types.KnowledgeGraph | null;
  selectedNode: Types.KnowledgeGraphNode | null;
  selectedNodeDetails: Record<string, any> | null;
  selectedNodeNeighbors: any[];
  selectedEdge: Types.KnowledgeGraphEdge | null;
  expandingNodeId: string | null;

  // Global Search
  searchQuery: string;
  searchResults: Types.KnowledgeSearchResult[];

  // Filters
  filters: Types.KnowledgeFilters;

  // Pagination
  pagination: {
    mitre: { page: number; total: number };
    cve: { page: number; total: number };
    ioc: { page: number; total: number };
    threats: { page: number; total: number };
    campaigns: { page: number; total: number };
  };

  // Loading / error per section
  loading: {
    mitre: boolean;
    cve: boolean;
    ioc: boolean;
    threats: boolean;
    campaigns: boolean;
    graph: boolean;
    search: boolean;
    nodeDetails: boolean;
  };
  error: {
    mitre: string | null;
    cve: string | null;
    ioc: string | null;
    threats: string | null;
    campaigns: string | null;
    graph: string | null;
    search: string | null;
    nodeDetails: string | null;
  };
}

const initialState: KnowledgeState = {
  mitreTechniques: [],
  selectedMitre: null,
  cveRecords: [],
  selectedCve: null,
  iocRecords: [],
  threatActors: [],
  campaigns: [],
  graph: null,
  selectedNode: null,
  selectedNodeDetails: null,
  selectedNodeNeighbors: [],
  selectedEdge: null,
  expandingNodeId: null,
  searchQuery: '',
  searchResults: [],
  filters: {},
  pagination: {
    mitre: { page: 1, total: 0 },
    cve: { page: 1, total: 0 },
    ioc: { page: 1, total: 0 },
    threats: { page: 1, total: 0 },
    campaigns: { page: 1, total: 0 },
  },
  loading: {
    mitre: false,
    cve: false,
    ioc: false,
    threats: false,
    campaigns: false,
    graph: false,
    search: false,
    nodeDetails: false,
  },
  error: {
    mitre: null,
    cve: null,
    ioc: null,
    threats: null,
    campaigns: null,
    graph: null,
    search: null,
    nodeDetails: null,
  },
};

// ─── Store Class ──────────────────────────────────────────────────────────────

export class KnowledgeStore extends Store<KnowledgeState> {
  constructor() {
    super(initialState);
  }

  // ─── Setters ────────────────────────────────────────────────────────────────

  setMitreTechniques(techniques: Types.MitreTechnique[]): void {
    this.setState({ mitreTechniques: techniques });
  }

  setSelectedMitre(technique: Types.MitreTechnique | null): void {
    this.setState({ selectedMitre: technique });
  }

  setCveRecords(records: Types.CveRecord[]): void {
    this.setState({ cveRecords: records });
  }

  setSelectedCve(record: Types.CveRecord | null): void {
    this.setState({ selectedCve: record });
  }

  setIocRecords(records: Types.IocRecord[]): void {
    this.setState({ iocRecords: records });
  }

  setThreatActors(actors: Types.ThreatActor[]): void {
    this.setState({ threatActors: actors });
  }

  setCampaigns(campaigns: Types.Campaign[]): void {
    this.setState({ campaigns });
  }

  setGraph(graph: Types.KnowledgeGraph | null): void {
    this.setState({ graph });
  }

  setSearchQuery(query: string): void {
    this.setState({ searchQuery: query });
  }

  setSearchResults(results: Types.KnowledgeSearchResult[]): void {
    this.setState({ searchResults: results });
  }

  setFilters(filters: Types.KnowledgeFilters): void {
    this.setState({ filters });
  }

  mergeFilters(partial: Partial<Types.KnowledgeFilters>): void {
    this.setState((state) => ({ filters: { ...state.filters, ...partial } }));
  }

  clearFilters(): void {
    this.setState({ filters: {} });
  }

  private setLoading(section: keyof KnowledgeState['loading'], value: boolean): void {
    this.setState((state) => ({
      loading: { ...state.loading, [section]: value },
    }));
  }

  private setError(section: keyof KnowledgeState['error'], msg: string | null): void {
    this.setState((state) => ({
      error: { ...state.error, [section]: msg },
    }));
  }

  // ─── Async Actions ──────────────────────────────────────────────────────────

  async loadMitre(projectId: string): Promise<void> {
    this.setLoading('mitre', true);
    this.setError('mitre', null);
    try {
      const res = await request.get<{ techniques: Types.MitreTechnique[]; total: number }>(
        Endpoints.knowledge.mitre.list(projectId)
      );
      this.setState((state) => ({
        mitreTechniques: res.techniques ?? [],
        pagination: {
          ...state.pagination,
          mitre: { ...state.pagination.mitre, total: res.total ?? res.techniques?.length ?? 0 },
        },
      }));
    } catch (err: any) {
      this.setError('mitre', err?.message ?? 'Failed to load MITRE techniques');
    } finally {
      this.setLoading('mitre', false);
    }
  }

  async loadMitreTechnique(projectId: string, techniqueId: string): Promise<void> {
    this.setLoading('mitre', true);
    this.setError('mitre', null);
    try {
      const technique = await request.get<Types.MitreTechnique>(
        Endpoints.knowledge.mitre.get(projectId, techniqueId)
      );
      this.setState({ selectedMitre: technique });
    } catch (err: any) {
      this.setError('mitre', err?.message ?? 'Failed to load technique');
    } finally {
      this.setLoading('mitre', false);
    }
  }

  async loadCve(projectId: string): Promise<void> {
    this.setLoading('cve', true);
    this.setError('cve', null);
    try {
      const res = await request.get<{ records: Types.CveRecord[]; total: number }>(
        Endpoints.knowledge.cve.list(projectId)
      );
      this.setState((state) => ({
        cveRecords: res.records ?? [],
        pagination: {
          ...state.pagination,
          cve: { ...state.pagination.cve, total: res.total ?? res.records?.length ?? 0 },
        },
      }));
    } catch (err: any) {
      this.setError('cve', err?.message ?? 'Failed to load CVE records');
    } finally {
      this.setLoading('cve', false);
    }
  }

  async loadIoc(projectId: string): Promise<void> {
    this.setLoading('ioc', true);
    this.setError('ioc', null);
    try {
      const res = await request.get<{ records: Types.IocRecord[]; total: number }>(
        Endpoints.knowledge.ioc.list(projectId)
      );
      this.setState((state) => ({
        iocRecords: res.records ?? [],
        pagination: {
          ...state.pagination,
          ioc: { ...state.pagination.ioc, total: res.total ?? res.records?.length ?? 0 },
        },
      }));
    } catch (err: any) {
      this.setError('ioc', err?.message ?? 'Failed to load IOC records');
    } finally {
      this.setLoading('ioc', false);
    }
  }

  async loadThreats(projectId: string): Promise<void> {
    this.setLoading('threats', true);
    this.setError('threats', null);
    try {
      const res = await request.get<{ actors: Types.ThreatActor[]; total: number }>(
        Endpoints.knowledge.threats.list(projectId)
      );
      this.setState((state) => ({
        threatActors: res.actors ?? [],
        pagination: {
          ...state.pagination,
          threats: { ...state.pagination.threats, total: res.total ?? res.actors?.length ?? 0 },
        },
      }));
    } catch (err: any) {
      this.setError('threats', err?.message ?? 'Failed to load threat actors');
    } finally {
      this.setLoading('threats', false);
    }
  }

  async loadCampaigns(projectId: string): Promise<void> {
    this.setLoading('campaigns', true);
    this.setError('campaigns', null);
    try {
      const res = await request.get<{ campaigns: Types.Campaign[]; total: number }>(
        Endpoints.knowledge.campaigns.list(projectId)
      );
      this.setState((state) => ({
        campaigns: res.campaigns ?? [],
        pagination: {
          ...state.pagination,
          campaigns: { ...state.pagination.campaigns, total: res.total ?? res.campaigns?.length ?? 0 },
        },
      }));
    } catch (err: any) {
      this.setError('campaigns', err?.message ?? 'Failed to load campaigns');
    } finally {
      this.setLoading('campaigns', false);
    }
  }

  async loadGraph(projectId: string): Promise<void> {
    this.setLoading('graph', true);
    this.setError('graph', null);
    try {
      const graph = await request.get<Types.KnowledgeGraph>(
        Endpoints.knowledge.graph(projectId)
      );
      this.setState({ graph });
    } catch (err: any) {
      this.setError('graph', err?.message ?? 'Failed to load knowledge graph');
    } finally {
      this.setLoading('graph', false);
    }
  }

  // ─── Selection & UTKG Interactions ──────────────────────────────────────────

  setSelectedNode(node: Types.KnowledgeGraphNode | null): void {
    this.setState({ selectedNode: node, selectedEdge: null });
    if (node) {
      this.loadNodeDetails(node.id);
    } else {
      this.setState({ selectedNodeDetails: null, selectedNodeNeighbors: [] });
    }
  }

  setSelectedEdge(edge: Types.KnowledgeGraphEdge | null): void {
    this.setState({ selectedEdge: edge, selectedNode: null, selectedNodeDetails: null, selectedNodeNeighbors: [] });
  }

  clearSelection(): void {
    this.setState({ selectedNode: null, selectedNodeDetails: null, selectedNodeNeighbors: [], selectedEdge: null });
  }

  async loadNodeDetails(nodeId: string): Promise<void> {
    this.setLoading('nodeDetails', true);
    this.setError('nodeDetails', null);
    try {
      // 1. Fetch single node details from UTKG backend
      const nodeRes = await agentRequest.get<{ status: string; node: any }>(
        Endpoints.knowledge.utkg.node(nodeId)
      ).catch(() => null);

      // 2. Fetch node neighbors from UTKG backend
      const neighborsRes = await agentRequest.get<{ status: string; neighbors: any[]; count: number }>(
        Endpoints.knowledge.utkg.neighbors(nodeId)
      ).catch(() => null);

      this.setState({
        selectedNodeDetails: nodeRes?.node ?? null,
        selectedNodeNeighbors: neighborsRes?.neighbors ?? [],
      });
    } catch (err: any) {
      this.setError('nodeDetails', err?.message ?? 'Failed to load node details');
    } finally {
      this.setLoading('nodeDetails', false);
    }
  }

  async expandNode(projectId: string, nodeId: string, depth = 2): Promise<void> {
    this.setState({ expandingNodeId: nodeId });
    try {
      // Fetch expanded subgraph centered on nodeId
      const res = await agentRequest.get<{ status: string; subgraph: { nodes: any[]; edges: any[] } }>(
        Endpoints.knowledge.utkg.subgraph(nodeId, undefined, depth)
      ).catch(async () => {
        // Fallback to Next.js route with center_node_id
        return request.get<{ nodes: any[]; edges: any[] }>(
          `${Endpoints.knowledge.graph(projectId)}?center_node_id=${encodeURIComponent(nodeId)}&depth=${depth}`
        ).then(r => ({ status: 'success', subgraph: { nodes: r.nodes, edges: r.edges } }));
      });

      const newNodes: Types.KnowledgeGraphNode[] = (res.subgraph?.nodes ?? []).map((n: any) => ({
        id: n.node_id ?? n.id ?? n.canonical_id,
        type: (n.node_type ?? n.type ?? 'asset').toLowerCase(),
        label: String(n.label ?? n.name ?? n.canonical_id ?? n.id),
        name: n.name ?? n.label,
        description: n.description ?? '',
        confidence: n.confidence ?? 1.0,
        source_feed: n.source_feed ?? 'UTKG Backend',
        external_id: n.external_id ?? '',
        risk: n.risk ?? 'MEDIUM',
        metadata: { ...(n.data ?? {}), ...(n.properties ?? {}) },
        properties: n.properties ?? {},
      }));

      const newEdges: Types.KnowledgeGraphEdge[] = (res.subgraph?.edges ?? []).map((e: any, idx: number) => ({
        id: e.edge_id ?? e.id ?? `e_${nodeId}_${idx}`,
        source: String(e.source_node_id ?? e.source),
        target: String(e.target_node_id ?? e.target),
        label: String(e.edge_type ?? e.label ?? 'connects'),
        edge_type: e.edge_type ?? e.label ?? 'connects',
        weight: e.weight ?? 1.0,
        confidence: e.confidence ?? 1.0,
        evidence_count: e.evidence_count ?? 0,
        source_feed: e.source_feed ?? 'UTKG Backend',
      }));

      this.setState((state) => {
        if (!state.graph) return { graph: { nodes: newNodes, edges: newEdges } };
        const existingNodeIds = new Set(state.graph.nodes.map((n) => n.id));
        const existingEdgeIds = new Set(state.graph.edges.map((e) => e.id));

        const mergedNodes = [...state.graph.nodes];
        newNodes.forEach((n) => { if (!existingNodeIds.has(n.id)) mergedNodes.push(n); });

        const mergedEdges = [...state.graph.edges];
        newEdges.forEach((e) => { if (!existingEdgeIds.has(e.id)) mergedEdges.push(e); });

        return { graph: { nodes: mergedNodes, edges: mergedEdges } };
      });
    } catch (err: any) {
      this.setError('graph', `Failed to expand node: ${err?.message || err}`);
    } finally {
      this.setState({ expandingNodeId: null });
    }
  }

  async search(projectId: string, query: string): Promise<void> {
    if (!query.trim()) {
      this.setState({ searchResults: [] });
      return;
    }
    this.setLoading('search', true);
    this.setError('search', null);
    try {
      const url = `${Endpoints.knowledge.search(projectId)}?q=${encodeURIComponent(query)}`;
      const res = await request.get<{ results: Types.KnowledgeSearchResult[] }>(url);
      this.setState({ searchResults: res.results ?? [] });
    } catch (err: any) {
      this.setError('search', err?.message ?? 'Search failed');
    } finally {
      this.setLoading('search', false);
    }
  }

  async loadAll(projectId: string): Promise<void> {
    await Promise.allSettled([
      this.loadMitre(projectId),
      this.loadCve(projectId),
      this.loadIoc(projectId),
      this.loadThreats(projectId),
      this.loadCampaigns(projectId),
    ]);
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const knowledgeStore = new KnowledgeStore();
