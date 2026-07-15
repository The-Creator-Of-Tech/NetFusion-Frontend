import { Store } from './base';
import * as Types from '../types/api';
import { request } from '../api/request';
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
  };
  error: {
    mitre: string | null;
    cve: string | null;
    ioc: string | null;
    threats: string | null;
    campaigns: string | null;
    graph: string | null;
    search: string | null;
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
  },
  error: {
    mitre: null,
    cve: null,
    ioc: null,
    threats: null,
    campaigns: null,
    graph: null,
    search: null,
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
