"use client";

import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

export default function NetworkGraph({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: any[];
  edges: any[];
  onNodeClick?: (ip: string) => void;
}) {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_, node) => {
          if (onNodeClick) {
            onNodeClick(node.id);
          }
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
