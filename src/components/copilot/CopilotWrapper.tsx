"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CopilotSidebar from "./CopilotSidebar";
import { useNetfusionContext } from "./NetfusionContextProvider";

interface Props {
  projectId: string;
  children: React.ReactNode;
}

const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 340;
const MAX_WIDTH = 750;

export default function CopilotWrapper({ projectId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const { netfusionContext } = useNetfusionContext();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize state from localStorage
  useEffect(() => {
    try {
      const storedOpen = localStorage.getItem("netfusion_copilot_open");
      if (storedOpen === "true") {
        setOpen(true);
      }
      const storedWidth = localStorage.getItem("netfusion_copilot_width");
      if (storedWidth) {
        const parsed = parseInt(storedWidth, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          setWidth(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSetOpen = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setOpen((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem("netfusion_copilot_open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleCopilot = useCallback(() => {
    handleSetOpen((v) => !v);
  }, [handleSetOpen]);

  const handleWidthChange = useCallback((newWidth: number) => {
    const clamped = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
    setWidth(clamped);
    try {
      localStorage.setItem("netfusion_copilot_width", String(clamped));
    } catch {
      // ignore
    }
  }, []);

  // Global Keyboard Shortcuts (Cmd+K, Ctrl+K, Alt+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCopilot();
      } else if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        toggleCopilot();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCopilot]);

  // Drag Resizing logic
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = startX - moveEvent.clientX;
        handleWidthChange(startWidth + deltaX);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [width, handleWidthChange]
  );

  const isCopilotOpen = open;

  return (
    <div ref={wrapperRef} className="flex flex-1 overflow-hidden relative">
      {/* Main content area */}
      <div
        className={`flex flex-1 overflow-hidden ${
          isResizing ? "" : "transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        }`}
        style={{ marginRight: open ? width : 0 }}
      >
        {children}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-35 bg-black/20 backdrop-blur-[1px] lg:hidden"
          onClick={() => handleSetOpen(false)}
        />
      )}

      <CopilotSidebar
        projectId={projectId}
        open={open}
        width={width}
        onClose={() => handleSetOpen(false)}
        onMouseDownResize={handleMouseDown}
        isResizing={isResizing}
        netfusionContext={netfusionContext ?? undefined}
      />

      {/* Unified Floating Action Button (FAB) */}
      <button
        onClick={toggleCopilot}
        aria-label={isCopilotOpen ? "Close AI Copilot (Ctrl+K)" : "Open AI Copilot (Ctrl+K)"}
        title="AI Copilot Assistant (Ctrl+K)"
        className={`
          fixed bottom-6 right-6 z-50
          h-12 px-4 rounded-2xl shadow-xl border border-accent/30
          flex items-center gap-2.5 font-semibold text-xs
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${
            isCopilotOpen
              ? "bg-surface border-border text-muted scale-90 opacity-80 hover:opacity-100"
              : "bg-accent text-foreground hover:bg-accent-hover scale-100 opacity-100 shadow-accent/20 active:scale-95"
          }
        `}
      >
        <div className="w-6 h-6 rounded-lg bg-foreground/10 flex items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.5 1.116a1 1 0 0 1 1 0l5.25 3.032a1 1 0 0 1 .5.866v6.972a1 1 0 0 1-.5.866L8.5 14.884a1 1 0 0 1-1 0L2.25 11.852a1 1 0 0 1-.5-.866V4.014a1 1 0 0 1 .5-.866ZM8 2.45 3.25 5.183v5.634L8 13.55l4.75-2.733V5.183Z" />
          </svg>
        </div>
        <span>{isCopilotOpen ? "Hide Copilot" : "AI Copilot"}</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-foreground/15 rounded border border-foreground/20">
          ⌘K
        </kbd>
      </button>
    </div>
  );
}

