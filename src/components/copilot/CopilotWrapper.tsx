"use client";

import { useState } from "react";
import CopilotSidebar from "./CopilotSidebar";
import { useNetfusionContext } from "./NetfusionContextProvider";

interface Props {
  projectId: string;
  children:  React.ReactNode;
}

export default function CopilotWrapper({ projectId, children }: Props) {
  const [open, setOpen] = useState(false);
  const { netfusionContext } = useNetfusionContext();

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Main content — shrinks when sidebar is open */}
      <div
        className="flex flex-1 overflow-hidden transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ marginRight: open ? 380 : 0 }}
      >
        {children}
      </div>

      {/* Sidebar */}
      <CopilotSidebar
        projectId={projectId}
        open={open}
        onClose={() => setOpen(false)}
        netfusionContext={netfusionContext ?? undefined}
      />

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI Copilot" : "Open AI Copilot"}
        className={`
          fixed bottom-6 right-6 z-50
          w-12 h-12 rounded-2xl shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${open
            ? "bg-surface border border-border text-muted scale-90 opacity-0 pointer-events-none"
            : "bg-accent text-background hover:bg-accent-hover scale-100 opacity-100"
          }
        `}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.5 1.116a1 1 0 0 1 1 0l5.25 3.032a1 1 0 0 1 .5.866v6.972a1 1 0 0 1-.5.866L8.5 14.884a1 1 0 0 1-1 0L2.25 11.852a1 1 0 0 1-.5-.866V4.014a1 1 0 0 1 .5-.866ZM8 2.45 3.25 5.183v5.634L8 13.55l4.75-2.733V5.183Z" />
        </svg>
      </button>
    </div>
  );
}
