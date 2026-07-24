"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { knowledgeStore } from "@/store/knowledge";
import type { KnowledgeGraphNode, KnowledgeGraphEdge } from "@/types/api";

// ── Color and Icon Registry for UTKG Node Types ────────────────────────────
const NODE_STYLE_MAP: Record<
  string,
  { bg: string; border: string; text: string; icon: string; label: string }
> = {
  asset:         { bg: "#1e293b", border: "#3b82f6", text: "#60a5fa", icon: "💻", label: "Asset" },
  host:          { bg: "#1e293b", border: "#3b82f6", text: "#60a5fa", icon: "🖥️", label: "Host" },
  device:        { bg: "#1e293b", border: "#3b82f6", text: "#60a5fa", icon: "📱", label: "Device" },
  finding:       { bg: "#311417", border: "#ef4444", text: "#f87171", icon: "⚠️", label: "Finding" },
  ioc:           { bg: "#2d2410", border: "#eab308", text: "#facc15", icon: "🎯", label: "IOC" },
  ip:            { bg: "#2d2410", border: "#eab308", text: "#facc15", icon: "🌐", label: "IP" },
  domain:        { bg: "#2d2410", border: "#eab308", text: "#facc15", icon: "🔗", label: "Domain" },
  hash:          { bg: "#2d2410", border: "#eab308", text: "#facc15", icon: "🔑", label: "Hash" },
  mitre:         { bg: "#231942", border: "#8b5cf6", text: "#a78bfa", icon: "🗡️", label: "MITRE" },
  attack_technique: { bg: "#231942", border: "#8b5cf6", text: "#a78bfa", icon: "🗡️", label: "Technique" },
  threat_actor:  { bg: "#361622", border: "#ec4899", text: "#f472b6", icon: "👤", label: "Threat Actor" },
  malware:       { bg: "#361622", border: "#ec4899", text: "#f472b6", icon: "🦠", label: "Malware" },
  campaign:      { bg: "#14281d", border: "#22c55e", text: "#4ade80", icon: "📊", label: "Campaign" },
  cve:           { bg: "#351e13", border: "#f97316", text: "#fb923c", icon: "🔓", label: "CVE" },
  vulnerability: { bg: "#351e13", border: "#f97316", text: "#fb923c", icon: "🔓", label: "Vulnerability" },
  alert:         { bg: "#3b1319", border: "#f43f5e", text: "#fda4af", icon: "🚨", label: "Alert" },
  report:        { bg: "#132a26", border: "#14b8a6", text: "#2dd4bf", icon: "📄", label: "Report" },
  evidence:      { bg: "#1c2536", border: "#6366f1", text: "#818cf8", icon: "📁", label: "Evidence" },
};

const DEFAULT_NODE_STYLE = {
  bg: "#1f2937",
  border: "#6b7280",
  text: "#9ca3af",
  icon: "📌",
  label: "Entity",
};

const EDGE_COLORS: Record<string, string> = {
  has_finding:    "#ef4444",
  matched_ioc:    "#eab308",
  maps_to:        "#8b5cf6",
  uses_technique: "#22c55e",
  EXPLOITS:       "#f97316",
  TARGETS:        "#ec4899",
  CONDUCTED_BY:   "#10b981",
  ATTRIBUTED_TO:  "#a855f7",
  CONTAINS_IOC:   "#eab308",
  default:        "#4b5563",
};

function getNodeStyle(type: string) {
  const norm = type ? type.toLowerCase() : "";
  return NODE_STYLE_MAP[norm] ?? DEFAULT_NODE_STYLE;
}

function buildFlowNodes(
  graphNodes: KnowledgeGraphNode[],
  selectedNodeId?: string
): Node[] {
  const groups: Record<string, KnowledgeGraphNode[]> = {};
  graphNodes.forEach((n) => {
    const t = n.type.toLowerCase();
    if (!groups[t]) groups[t] = [];
    groups[t].push(n);
  });

  const nodes: Node[] = [];
  const typeKeys = Object.keys(groups);
  const colWidth = 230;
  const rowHeight = 90;

  typeKeys.forEach((type, colIdx) => {
    const items = groups[type];
    items.forEach((n, rowIdx) => {
      const styleInfo = getNodeStyle(n.type);
      const isSelected = n.id === selectedNodeId;

      nodes.push({
        id: n.id,
        position: { x: colIdx * colWidth + 50, y: rowIdx * 110 + 50 },
        width: 160,
        height: 85,
        data: {
          rawNode: n,
          label: (
            <div style={{ textAlign: "center", padding: "4px 8px" }}>
              <div style={{ fontSize: 18 }}>{styleInfo.icon}</div>
              <div
                style={{
                  fontSize: 11,
                  color: styleInfo.text,
                  fontWeight: 600,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 140,
                }}
              >
                {n.label}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginTop: 1,
                }}
              >
                {n.type.replace("_", " ")}
              </div>
              {n.confidence !== undefined && n.confidence < 1.0 && (
                <div style={{ fontSize: 8, color: "#eab308" }}>
                  {(n.confidence * 100).toFixed(0)}% conf
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: styleInfo.bg,
          border: isSelected
            ? `2px solid #60a5fa`
            : `1.5px solid ${styleInfo.border}`,
          borderRadius: 10,
          minWidth: 130,
          boxShadow: isSelected ? "0 0 12px rgba(96,165,250,0.5)" : "none",
          cursor: "pointer",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  });

  return nodes;
}

function buildFlowEdges(
  graphEdges: KnowledgeGraphEdge[],
  selectedEdgeId?: string
): Edge[] {
  return graphEdges.map((e) => {
    const edgeType = e.edge_type ?? e.label ?? "default";
    const strokeColor = EDGE_COLORS[edgeType] ?? EDGE_COLORS.default;
    const isSelected = e.id === selectedEdgeId;

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ?? edgeType.replace("_", " "),
      animated:
        edgeType.includes("EXPLOITS") ||
        edgeType.includes("matched") ||
        edgeType.includes("uses") ||
        edgeType.includes("TARGETS"),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
      },
      style: {
        stroke: isSelected ? "#38bdf8" : strokeColor,
        strokeWidth: isSelected ? 3 : 1.5,
      },
      labelStyle: { fontSize: 9, fill: "#9ca3af" },
      labelBgStyle: { fill: "#0d1117", fillOpacity: 0.8 },
      data: { rawEdge: e },
    };
  });
}

function GraphInner({ projectId }: { projectId: string }) {
  const state = knowledgeStore.useStore();
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Local Filter States
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>("ALL");
  const [minConfidenceFilter, setMinConfidenceFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    knowledgeStore.loadGraph(projectId);
  }, [projectId]);

  // Sync ReactFlow nodes & edges when store graph changes or filters change
  useEffect(() => {
    if (!state.graph) return;

    let filteredNodes = state.graph.nodes;

    if (nodeTypeFilter !== "ALL") {
      filteredNodes = filteredNodes.filter(
        (n) => n.type.toLowerCase() === nodeTypeFilter.toLowerCase()
      );
    }

    if (minConfidenceFilter > 0) {
      filteredNodes = filteredNodes.filter(
        (n) => (n.confidence ?? 1.0) >= minConfidenceFilter
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q) ||
          (n.description && n.description.toLowerCase().includes(q))
      );
    }

    const validNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = state.graph.edges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    );

    const convertedNodes = buildFlowNodes(filteredNodes, state.selectedNode?.id);
    const convertedEdges = buildFlowEdges(filteredEdges, state.selectedEdge?.id);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    convertedNodes.forEach((n) => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x);
      maxY = Math.max(maxY, n.position.y);
    });
    const graphBounds =
      convertedNodes.length > 0
        ? { minX, minY, maxX, maxY }
        : { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    console.log("================ UTKG RENDERING PIPELINE LOG ================");
    console.log(`Number of entities: ${state.graph.nodes.length}`);
    console.log(`Number of edges: ${state.graph.edges.length}`);
    console.log(`Converted nodes: ${convertedNodes.length}`, convertedNodes);
    console.log(`Converted edges: ${convertedEdges.length}`, convertedEdges);
    console.log("Graph bounds:", graphBounds);

    setNodes(convertedNodes);
    setEdges(convertedEdges);
  }, [
    state.graph,
    state.selectedNode,
    state.selectedEdge,
    nodeTypeFilter,
    minConfidenceFilter,
    searchQuery,
  ]);

  // Automatically trigger fitView when nodes are rendered and initialized in DOM
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        try {
          reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
          const viewport = reactFlowInstance.getViewport();
          console.log("Viewport coordinates:", viewport);
        } catch (e) {
          console.warn("fitView execution warning:", e);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, reactFlowInstance]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const rawNode: KnowledgeGraphNode = node.data?.rawNode;
      if (rawNode) {
        knowledgeStore.setSelectedNode(rawNode);
      }
    },
    []
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const rawEdge: KnowledgeGraphEdge = edge.data?.rawEdge;
      if (rawEdge) {
        knowledgeStore.setSelectedEdge(rawEdge);
      }
    },
    []
  );

  const onPaneClick = useCallback(() => {
    knowledgeStore.clearSelection();
  }, []);

  const handleRefresh = () => {
    knowledgeStore.loadGraph(projectId);
  };

  const handleCenter = () => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
  };

  const handleExpandSelectedNode = () => {
    if (state.selectedNode) {
      knowledgeStore.expandNode(projectId, state.selectedNode.id, 2);
    }
  };

  const loading = state.loading.graph;
  const error = state.error.graph;
  const graph = state.graph;
  const selectedNode = state.selectedNode;
  const selectedNodeDetails = state.selectedNodeDetails;
  const selectedNodeNeighbors = state.selectedNodeNeighbors;
  const selectedEdge = state.selectedEdge;
  const expandingNodeId = state.expandingNodeId;

  // Node Breakdown Stats
  const nodeTypeCounts = useMemo(() => {
    if (!graph?.nodes) return {};
    return graph.nodes.reduce((acc, n) => {
      const t = n.type.toLowerCase();
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [graph]);

  if (loading && !graph) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 animate-pulse">
          <svg
            width="24"
            height="24"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="text-accent animate-spin"
          >
            <path d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5h-1.5a5 5 0 1 1-5-5V1.5Z" />
          </svg>
        </div>
        <p className="text-foreground font-medium text-sm">
          Connecting to UTKG Live Graph...
        </p>
        <p className="text-muted text-xs mt-1">
          Loading knowledge graph nodes and intelligence relationships
        </p>
      </div>
    );
  }

  if (error && !graph) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-3 text-danger">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
        </div>
        <p className="text-foreground font-semibold mb-1">UTKG Integration Error</p>
        <p className="text-danger text-xs max-w-md mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-accent text-background font-medium text-xs rounded-lg hover:bg-accent/90 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 relative min-h-[calc(100vh-100px)] flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">
              Unified Threat Knowledge Graph (UTKG)
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold">
              Live Backend
            </span>
          </div>
          <p className="text-muted text-xs mt-0.5">
            {graph?.nodes.length ?? 0} active entities · {graph?.edges.length ?? 0}{" "}
            intelligence relationships
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-all"
            title="Refresh from UTKG backend"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.705 8.005a6.295 6.295 0 0 1 10.748-4.451L10.5 5.5H15V1l-1.78 1.78A7.795 7.795 0 0 0 0 8a.75.75 0 0 0 1.5 0c0 .002.205.005.205.005Z" />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleCenter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM2.5 8a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z" />
            </svg>
            Center Graph
          </button>
          {selectedNode && (
            <button
              onClick={handleExpandSelectedNode}
              disabled={expandingNodeId === selectedNode.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-xs text-accent font-medium hover:bg-accent/30 transition-all disabled:opacity-50"
            >
              {expandingNodeId === selectedNode.id ? (
                <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                </svg>
              )}
              Expand Node
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-surface border border-border p-3 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search UTKG entities, CVEs, IPs, techniques..."
            className="w-full bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          >
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
          </svg>
        </div>

        {/* Node Type Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted font-medium">Entity Type:</span>
          <select
            value={nodeTypeFilter}
            onChange={(e) => setNodeTypeFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All Entity Types</option>
            {Object.keys(nodeTypeCounts).map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")} ({nodeTypeCounts[type]})
              </option>
            ))}
          </select>
        </div>

        {/* Min Confidence Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted font-medium">Min Conf:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={minConfidenceFilter}
            onChange={(e) => setMinConfidenceFilter(parseFloat(e.target.value))}
            className="w-20 accent-accent cursor-pointer"
          />
          <span className="text-xs text-muted font-mono w-8">
            {(minConfidenceFilter * 100).toFixed(0)}%
          </span>
        </div>

        {/* Reset Filters */}
        {(nodeTypeFilter !== "ALL" || minConfidenceFilter > 0 || searchQuery) && (
          <button
            onClick={() => {
              setNodeTypeFilter("ALL");
              setMinConfidenceFilter(0);
              setSearchQuery("");
            }}
            className="text-xs text-accent hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Graph + Details Canvas Container */}
      <div
        className="relative rounded-xl border border-border overflow-hidden w-full h-[600px]"
        style={{ minHeight: 600, height: 600, width: "100%" }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultViewport={{ x: 20, y: 50, zoom: 0.85 }}
          minZoom={0.1}
          maxZoom={2.0}
          onInit={(instance) => {
            setTimeout(() => {
              instance.fitView({ padding: 0.2 });
            }, 200);
          }}
          attributionPosition="bottom-right"
          style={{ background: "#090d14", width: "100%", height: "100%" }}
        >
          <Background color="#1e293b" gap={24} />
          <Controls className="!bg-surface !border-border" />
          <MiniMap
            style={{ background: "#090d14", border: "1px solid #1e293b" }}
            nodeColor={(n: Node) => {
              const type = (n.data?.rawNode as KnowledgeGraphNode)?.type ?? "asset";
              return getNodeStyle(type).border;
            }}
          />
        </ReactFlow>

        {/* Legend Panel */}
        <div className="absolute bottom-4 left-4 z-10 bg-surface/90 backdrop-blur border border-border rounded-xl p-3 max-w-[200px] shadow-lg">
          <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mb-2">
            UTKG Entities
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {Object.entries(nodeTypeCounts).map(([type, count]) => {
              const st = getNodeStyle(type);
              return (
                <div key={type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{st.icon}</span>
                    <span className="text-muted capitalize truncate">
                      {type.replace("_", " ")}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.2 rounded-full border shrink-0"
                    style={{
                      borderColor: st.border,
                      color: st.text,
                      background: st.bg,
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Detail Side Panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 max-h-[calc(100%-2rem)] bg-surface/95 backdrop-blur border border-border rounded-2xl p-4 shadow-2xl overflow-y-auto space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg">
                    {getNodeStyle(selectedNode.type).icon}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                    style={{
                      borderColor: getNodeStyle(selectedNode.type).border,
                      color: getNodeStyle(selectedNode.type).text,
                      background: getNodeStyle(selectedNode.type).bg,
                    }}
                  >
                    {selectedNode.type.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground break-all">
                  {selectedNode.label}
                </h3>
              </div>
              <button
                onClick={() => knowledgeStore.setSelectedNode(null)}
                className="text-muted hover:text-foreground text-xs p-1 rounded-lg hover:bg-surface-2"
              >
                ✕
              </button>
            </div>

            {/* Core Attributes */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Node ID:</span>
                <span className="font-mono text-foreground break-all max-w-[170px] text-right">
                  {selectedNode.id}
                </span>
              </div>
              {selectedNode.external_id && (
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">External ID:</span>
                  <span className="font-mono text-accent">
                    {selectedNode.external_id}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Confidence:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {((selectedNode.confidence ?? 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Source Feed:</span>
                <span className="text-foreground">
                  {selectedNode.source_feed ?? "UTKG Intelligence"}
                </span>
              </div>
              {selectedNode.risk && (
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">Risk Level:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      selectedNode.risk === "CRITICAL" || selectedNode.risk === "HIGH"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    }`}
                  >
                    {selectedNode.risk}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedNode.description && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Description
                </p>
                <p className="text-xs text-foreground bg-surface-2 p-2.5 rounded-xl border border-border/60 leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>
            )}

            {/* Connected Neighbors (Lazy loaded from UTKG) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Connected Entities ({selectedNodeNeighbors.length})
                </p>
                {state.loading.nodeDetails && (
                  <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {selectedNodeNeighbors.length === 0 ? (
                <p className="text-xs text-muted italic">
                  {state.loading.nodeDetails
                    ? "Fetching neighbors..."
                    : "No direct connections found"}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedNodeNeighbors.map((nb: any, idx: number) => {
                    const nodeInfo = nb.node ?? nb;
                    const edgeInfo = nb.edge ?? {};
                    const st = getNodeStyle(nodeInfo.node_type ?? nodeInfo.type ?? "");
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-surface-2 rounded-lg border border-border/60 text-xs hover:border-accent/40 cursor-pointer"
                        onClick={() =>
                          knowledgeStore.setSelectedNode({
                            id: nodeInfo.node_id ?? nodeInfo.id,
                            type: nodeInfo.node_type ?? nodeInfo.type ?? "asset",
                            label: nodeInfo.label ?? nodeInfo.name ?? nodeInfo.node_id,
                            confidence: nodeInfo.confidence ?? 1.0,
                          })
                        }
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{st.icon}</span>
                          <span className="text-foreground truncate font-medium">
                            {nodeInfo.label ?? nodeInfo.name ?? nodeInfo.node_id}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border">
                          {edgeInfo.edge_type ?? "connects"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Node Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleExpandSelectedNode}
                disabled={expandingNodeId === selectedNode.id}
                className="w-full py-2 bg-accent text-background font-semibold text-xs rounded-xl hover:bg-accent/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {expandingNodeId === selectedNode.id ? (
                  <span className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                  </svg>
                )}
                Expand Neighborhood (UTKG)
              </button>
            </div>
          </div>
        )}

        {/* Edge Detail Side Panel */}
        {selectedEdge && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-surface/95 backdrop-blur border border-border rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Relationship Details
                </h3>
              </div>
              <button
                onClick={() => knowledgeStore.setSelectedEdge(null)}
                className="text-muted hover:text-foreground text-xs p-1 rounded-lg hover:bg-surface-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Relationship Type:</span>
                <span className="font-mono text-accent font-semibold">
                  {selectedEdge.edge_type ?? selectedEdge.label ?? "connects"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Source Entity:</span>
                <span className="font-mono text-foreground break-all max-w-[160px] text-right">
                  {selectedEdge.source}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Target Entity:</span>
                <span className="font-mono text-foreground break-all max-w-[160px] text-right">
                  {selectedEdge.target}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Confidence:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {((selectedEdge.confidence ?? 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Weight:</span>
                <span className="font-mono text-foreground">
                  {selectedEdge.weight ?? 1.0}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Evidence Count:</span>
                <span className="font-mono text-foreground font-semibold">
                  {selectedEdge.evidence_count ?? 0} evidence links
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted">Source Feed:</span>
                <span className="text-foreground">
                  {selectedEdge.source_feed ?? "UTKG Intelligence"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted mt-3 text-center">
        Click any node or edge to inspect live UTKG properties · Drag nodes to adjust view · Click &quot;Expand Node&quot; to query backend subgraphs
      </p>
    </div>
  );
}

interface Props {
  projectId: string;
}

export default function GraphClient({ projectId }: Props) {
  return (
    <ReactFlowProvider>
      <GraphInner projectId={projectId} />
    </ReactFlowProvider>
  );
}
