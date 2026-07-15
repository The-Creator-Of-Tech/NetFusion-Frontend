"use client";

import { useEffect, useCallback, useRef } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { knowledgeStore } from "@/store/knowledge";
import type { KnowledgeGraph, KnowledgeGraphNode } from "@/types/api";

// Node type color map
const NODE_COLORS: Record<KnowledgeGraphNode["type"], { bg: string; border: string; text: string; icon: string }> = {
  asset:        { bg: "#1a2332", border: "#3b82f6", text: "#60a5fa", icon: "💻" },
  finding:      { bg: "#2a1a1a", border: "#ef4444", text: "#f87171", icon: "⚠️" },
  ioc:          { bg: "#2a2a1a", border: "#eab308", text: "#facc15", icon: "🎯" },
  mitre:        { bg: "#1a1a2a", border: "#8b5cf6", text: "#a78bfa", icon: "🗡️" },
  threat_actor: { bg: "#2a1a1f", border: "#ec4899", text: "#f472b6", icon: "👤" },
  campaign:     { bg: "#1a2a1a", border: "#22c55e", text: "#4ade80", icon: "📊" },
  cve:          { bg: "#2a1f1a", border: "#f97316", text: "#fb923c", icon: "🔓" },
};

const EDGE_COLORS: Record<string, string> = {
  has_finding:      "#ef4444",
  matched_ioc:      "#eab308",
  maps_to:          "#8b5cf6",
  technique_uses:   "#ec4899",
  uses_technique:   "#22c55e",
  default:          "#374151",
};

function buildFlowNodes(graphNodes: KnowledgeGraphNode[]): Node[] {
  const groups: Record<string, KnowledgeGraphNode[]> = {};
  graphNodes.forEach((n) => {
    if (!groups[n.type]) groups[n.type] = [];
    groups[n.type].push(n);
  });

  const nodes: Node[] = [];
  const typeOrder: KnowledgeGraphNode["type"][] = ["asset", "finding", "ioc", "mitre", "threat_actor", "campaign", "cve"];
  const colWidth = 220;
  const rowHeight = 80;

  typeOrder.forEach((type, colIdx) => {
    const items = groups[type] ?? [];
    items.forEach((n, rowIdx) => {
      const colors = NODE_COLORS[n.type];
      nodes.push({
        id: n.id,
        position: { x: colIdx * colWidth, y: rowIdx * rowHeight },
        data: {
          label: (
            <div style={{ textAlign: "center", padding: "4px 8px" }}>
              <div style={{ fontSize: 16 }}>{colors.icon}</div>
              <div style={{ fontSize: 10, color: colors.text, fontWeight: 600, marginTop: 2 }}>
                {n.label.length > 20 ? n.label.slice(0, 18) + "…" : n.label}
              </div>
              <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{n.type.replace("_", " ")}</div>
            </div>
          ),
        },
        style: {
          background: colors.bg,
          border: `1.5px solid ${colors.border}`,
          borderRadius: 10,
          minWidth: 100,
          cursor: "pointer",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  });

  return nodes;
}

function buildFlowEdges(graphEdges: Array<{ id: string; source: string; target: string; label?: string }>): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.label?.includes("matched") || e.label?.includes("uses"),
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[e.label ?? "default"] ?? EDGE_COLORS.default },
    style: { stroke: EDGE_COLORS[e.label ?? "default"] ?? EDGE_COLORS.default, strokeWidth: 1.5 },
    labelStyle: { fontSize: 9, fill: "#9ca3af" },
    labelBgStyle: { fill: "#0d1117" },
  }));
}

function Legend() {
  const types: KnowledgeGraphNode["type"][] = ["asset", "finding", "ioc", "mitre", "threat_actor", "campaign", "cve"];
  return (
    <div className="absolute bottom-12 left-4 z-10 bg-surface/90 backdrop-blur border border-border rounded-xl p-3 space-y-1.5">
      <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2">Legend</p>
      {types.map((t) => {
        const c = NODE_COLORS[t];
        return (
          <div key={t} className="flex items-center gap-2">
            <span className="text-xs">{c.icon}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.border }} />
            <span className="text-xs text-muted capitalize">{t.replace("_", " ")}</span>
          </div>
        );
      })}
    </div>
  );
}

interface Props { projectId: string }

export default function GraphClient({ projectId }: Props) {
  const state = knowledgeStore.useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => { knowledgeStore.loadGraph(projectId); }, [projectId]);

  useEffect(() => {
    if (state.graph) {
      setNodes(buildFlowNodes(state.graph.nodes));
      setEdges(buildFlowEdges(state.graph.edges));
    }
  }, [state.graph]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), []);

  const loading = state.loading.graph;
  const error = state.error.graph;
  const graph = state.graph;

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 animate-pulse">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" className="text-muted"><path d="M6 2a4 4 0 0 1 4 4c0 .711-.186 1.381-.511 1.962L11.946 9.4A4.5 4.5 0 1 1 9.4 11.946l-1.438-1.457A4 4 0 1 1 6 2Z"/></svg>
        </div>
        <p className="text-muted text-sm">Building correlation graph…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] text-center">
        <p className="text-danger text-sm mb-3">{error}</p>
        <button onClick={() => knowledgeStore.loadGraph(projectId)} className="text-xs text-accent hover:underline">Retry</button>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M6 2a4 4 0 0 1 4 4c0 .711-.186 1.381-.511 1.962L11.946 9.4A4.5 4.5 0 1 1 9.4 11.946l-1.438-1.457A4 4 0 1 1 6 2Zm0 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm6.5 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>
        </div>
        <p className="text-foreground font-medium mb-1">No Graph Data</p>
        <p className="text-muted text-sm max-w-xs">Add assets, findings, or run a capture session to build the correlation graph.</p>
      </div>
    );
  }

  const nodeTypes = graph.nodes.reduce((acc, n) => {
    if (!acc[n.type]) acc[n.type] = 0;
    acc[n.type]++;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Correlation Graph</h1>
          <p className="text-muted text-xs mt-0.5">{graph.nodes.length} nodes · {graph.edges.length} connections</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(nodeTypes).map(([type, count]) => {
            const c = NODE_COLORS[type as KnowledgeGraphNode["type"]];
            return (
              <span key={type} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{ borderColor: c?.border, color: c?.text, background: c?.bg }}>
                {c?.icon} {count} {type.replace("_", " ")}
              </span>
            );
          })}
        </div>
      </div>

      {/* Graph */}
      <div className="relative rounded-xl border border-border overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
          style={{ background: "#0d1117" }}
        >
          <Background color="#1e2736" gap={20} />
          <Controls className="!bg-surface !border-border" />
          <MiniMap
            style={{ background: "#0d1117", border: "1px solid #1e2736" }}
            nodeColor={(n: Node) => {
              const type = (n.data as any)?.type ?? "asset";
              return NODE_COLORS[type as KnowledgeGraphNode["type"]]?.border ?? "#374151";
            }}
          />
        </ReactFlow>
        <Legend />
      </div>

      <p className="text-xs text-muted mt-3 text-center">
        Drag nodes to rearrange · Scroll to zoom · Click nodes for details
      </p>
    </div>
  );
}
