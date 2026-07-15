"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useConversation } from "@/hooks/useConversation";
import { useStreaming } from "@/hooks/useStreaming";
import { useReasoning } from "@/hooks/useReasoning";
import { useMemory } from "@/hooks/useMemory";
import { useContext } from "@/hooks/useContext";
import { useProviders } from "@/hooks/useProviders";

export interface NetfusionContext {
  summary?: string;
  iocs?: { type: string; severity: string; description?: string }[];
  correlations?: { title: string; description?: string }[];
  alerts?: { title: string; severity: string; description?: string }[];
  timeline?: { time?: string; protocol?: string; src?: string; dst?: string; title?: string; type?: string }[];
  threatIntel?: { ip?: string; org?: string; country?: string; risk?: string; classification?: string; summary?: string } | null;
  hostRiskRanking?: { ip: string; score: number; reasons: string[] }[];
  mitreMapping?: { id: string; name: string; tactic: string; evidence: string }[];
}

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  netfusionContext?: NetfusionContext;
}

const SUGGESTIONS = [
  "Which host is most suspicious?",
  "Show active alerts",
  "List IOC findings",
  "Explain MITRE detections",
  "Which hosts communicate externally?",
  "Summarize encrypted traffic",
  "What should I investigate first?",
  "Explain the attack story",
] as const;

// ── Premium Markdown Parser with Code Block Copying ──────────────────────────

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded bg-surface border border-border text-text-secondary hover:text-foreground hover:bg-surface-hover transition-all shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // Code block
    if (part.startsWith("```") && part.endsWith("```")) {
      const content = part.slice(3, -3).trim();
      const lines = content.split("\n");
      const firstLine = lines[0] || "";
      const hasLanguage = !firstLine.includes(" ") && firstLine.length > 0 && firstLine.length < 15;
      const language = hasLanguage ? firstLine : "code";
      const code = hasLanguage ? lines.slice(1).join("\n") : content;

      return (
        <div key={index} className="my-3 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-inner">
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-surface border-b border-border text-xs text-text-secondary font-mono">
            <span className="capitalize">{language}</span>
            <CopyButton text={code} />
          </div>
          <pre className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed text-foreground select-text">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Inline elements: split lines
    const lines = part.split("\n");
    return lines.map((line, lineIdx) => {
      const key = `${index}-${lineIdx}`;

      // Bullet items
      if (/^[-*]\s/.test(line)) {
        const content = line.replace(/^[-*]\s/, "");
        return (
          <div key={key} className="flex gap-2 mb-1 pl-1">
            <span className="text-accent shrink-0 select-none">•</span>
            <span className="text-foreground">{inlineFormatting(content)}</span>
          </div>
        );
      }

      // Headers
      if (/^#{1,4}\s/.test(line)) {
        const level = (line.match(/^#+/) || ["#"])[0].length;
        const content = line.replace(/^#+\s/, "");
        const sizeClass = level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-semibold" : "text-sm font-semibold";
        return (
          <p key={key} className={`${sizeClass} text-foreground mt-3 mb-1.5`}>
            {inlineFormatting(content)}
          </p>
        );
      }

      // Empty line spacer
      if (line.trim() === "") {
        return <div key={key} className="h-2" />;
      }

      // Normal line
      return (
        <p key={key} className="mb-1 leading-relaxed">
          {inlineFormatting(line)}
        </p>
      );
    });
  });
}

function inlineFormatting(text: string): React.ReactNode {
  // Simple bold parser
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ── Main Sidebar component ─────────────────────────────────────────────────────

type SidebarTab = "chat" | "context" | "reasoning" | "debug";

export default function CopilotSidebar({
  projectId,
  open,
  onClose,
  netfusionContext,
}: Props) {
  // Hooks
  const {
    conversations,
    activeConversation,
    activeConversationId,
    loading,
    error,
    isStreaming,
    streamedContent,
    loadConversations,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    archiveConversation,
    sendMessage,
    cancelGeneration,
    retryResponse,
  } = useConversation();

  const { typingSpeed, setTypingSpeed } = useStreaming();
  const { reasoningSteps, confidence, intermediateChain, finalConclusion } = useReasoning();
  const { memoryEntries, searchQuery, addMemory, removeMemory, searchMemory } = useMemory();
  const { contextSize, attachedAssets, attachedFindings, attachAsset, detachAsset, attachFinding, detachFinding, setContext, setAttachedInvestigation } = useContext();
  const { providers, activeProvider, activeModel, providerStatus, latency, cost, tokens, switchProvider, switchModel } = useProviders();

  // Local component states
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
  const [input, setInput] = useState("");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [newMemoryText, setNewMemoryText] = useState("");
  const [debugEnabled, setDebugEnabled] = useState(false);

  // Refs for scroll & focus
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Init
  useEffect(() => {
    loadConversations();
    if (netfusionContext) {
      setContext(netfusionContext);
      setAttachedInvestigation(projectId);
    }
  }, [projectId, netfusionContext, loadConversations, setContext, setAttachedInvestigation]);

  // Scroll to bottom on updates
  useLayoutEffect(() => {
    if (activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversation?.messages, streamedContent, activeTab]);

  // Focus input
  useEffect(() => {
    if (open && activeTab === "chat") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, activeTab]);

  // Handler for sending messages
  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input, projectId, netfusionContext);
    setInput("");
  }, [input, isStreaming, projectId, netfusionContext, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Assembling dynamic prompts (Debug mode only)
  const systemPrompt = "You are a senior SOC analyst assisting the user with NetFusion network telemetry and investigation forensics.";
  const userPrompt = input || (activeConversation?.messages.slice(-1)[0]?.content ?? "No prompt entered.");
  const contextPrompt = `Investigation Scope: ${projectId}\nContext size: ${contextSize} chars\nAttached Assets: ${attachedAssets.join(", ") || "None"}\nAttached Findings: ${attachedFindings.join(", ") || "None"}`;
  const finalPrompt = `${systemPrompt}\n\n---\nCONTEXT:\n${contextPrompt}\n\n---\nUSER INSTRUCTION:\n${userPrompt}`;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Panel */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 z-40
          w-[420px] max-w-[100vw]
          flex flex-col
          bg-surface border-l border-border shadow-2xl
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
        aria-label="AI Copilot sidebar"
      >
        {/* Header Tabs */}
        <div className="flex flex-col border-b border-border bg-surface-2 shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-accent">
                  <path d="M7.5 1.116a1 1 0 0 1 1 0l5.25 3.032a1 1 0 0 1 .5.866v6.972a1 1 0 0 1-.5.866L8.5 14.884a1 1 0 0 1-1 0L2.25 11.852a1 1 0 0 1-.5-.866V4.014a1 1 0 0 1 .5-.866ZM8 2.45 3.25 5.183v5.634L8 13.55l4.75-2.733V5.183Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground leading-none">NetFusion Detective</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Active Workspace Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDebugEnabled(!debugEnabled)}
                className={`p-1.5 rounded text-[10px] font-mono tracking-wider transition-colors ${
                  debugEnabled ? "bg-accent-dim text-accent border border-accent/20" : "text-muted hover:text-foreground"
                }`}
                title="Toggle debug console"
              >
                DEBUG
              </button>
              <button
                onClick={onClose}
                className="text-muted hover:text-foreground transition-colors p-1.5 rounded"
                title="Close"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex px-2 pt-1.5 gap-1 text-xs font-medium select-none">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-2 border-b-2 transition-all ${
                activeTab === "chat" ? "border-accent text-accent font-semibold" : "border-transparent text-text-secondary hover:text-foreground"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("context")}
              className={`px-3 py-2 border-b-2 transition-all ${
                activeTab === "context" ? "border-accent text-accent font-semibold" : "border-transparent text-text-secondary hover:text-foreground"
              }`}
            >
              Context & Memory
            </button>
            <button
              onClick={() => setActiveTab("reasoning")}
              className={`px-3 py-2 border-b-2 transition-all ${
                activeTab === "reasoning" ? "border-accent text-accent font-semibold" : "border-transparent text-text-secondary hover:text-foreground"
              }`}
            >
              Reasoning & Models
            </button>
            {debugEnabled && (
              <button
                onClick={() => setActiveTab("debug")}
                className={`px-3 py-2 border-b-2 transition-all ${
                  activeTab === "debug" ? "border-accent text-accent font-semibold" : "border-transparent text-text-secondary hover:text-foreground"
                }`}
              >
                Assembled Prompts
              </button>
            )}
          </div>
        </div>

        {/* ─── TAB CONTENT: CHAT ─── */}
        {activeTab === "chat" && (
          <>
            {/* Conversation Selector HUD */}
            <div className="px-4 py-2 border-b border-border bg-surface-2 flex items-center justify-between shrink-0 select-none">
              <div className="relative flex-1 max-w-[240px]">
                <select
                  value={activeConversationId || ""}
                  onChange={(e) => selectConversation(e.target.value || null)}
                  className="w-full bg-surface border border-border text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
                >
                  <option value="">-- Select Chat --</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.status === "archived" ? "(Archived)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => createConversation()}
                  className="p-1.5 rounded bg-accent-dim text-accent hover:bg-accent hover:text-background transition-colors text-xs font-semibold flex items-center gap-1 border border-transparent"
                  title="New Conversation"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.75 2a.75.75 0 0 1 .75.75v5.25h5.25a.75.75 0 0 1 0 1.5H8.5v5.25a.75.75 0 0 1-1.5 0V9.5H1.75a.75.75 0 0 1 0-1.5h5.25V2.75A.75.75 0 0 1 7.75 2Z" />
                  </svg>
                  New
                </button>
                {activeConversationId && (
                  <>
                    <button
                      onClick={() => {
                        setEditingConvId(activeConversationId);
                        setEditTitle(activeConversation?.title || "");
                      }}
                      className="p-1.5 rounded hover:bg-surface-hover text-muted hover:text-foreground transition-colors border-none bg-transparent"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => archiveConversation(activeConversationId)}
                      className="p-1.5 rounded hover:bg-surface-hover text-muted hover:text-foreground transition-colors border-none bg-transparent"
                      title="Archive"
                    >
                      📦
                    </button>
                    <button
                      onClick={() => deleteConversation(activeConversationId)}
                      className="p-1.5 rounded hover:bg-surface-hover text-danger hover:bg-danger-dim transition-colors border-none bg-transparent"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Conversation Rename Input Overlay */}
            {editingConvId && (
              <div className="p-3 border-b border-border bg-accent-dim flex items-center gap-2 shrink-0 select-none">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 bg-surface border border-border text-xs rounded px-2.5 py-1 focus:outline-none text-foreground"
                />
                <button
                  onClick={() => {
                    renameConversation(editingConvId, editTitle);
                    setEditingConvId(null);
                  }}
                  className="bg-accent text-background px-2.5 py-1 text-[10px] font-semibold rounded border-none"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingConvId(null)}
                  className="text-muted text-xs font-semibold px-1 border-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Messages Feed */}
            <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-danger-dim border border-danger/30 text-xs text-danger">
                  <strong>Network Error:</strong> {error}
                </div>
              )}

              {!activeConversation || activeConversation.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 pb-6">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" className="text-accent animate-pulse">
                      <path d="M7.5 1.116a1 1 0 0 1 1 0l5.25 3.032a1 1 0 0 1 .5.866v6.972a1 1 0 0 1-.5.866L8.5 14.884a1 1 0 0 1-1 0L2.25 11.852a1 1 0 0 1-.5-.866V4.014a1 1 0 0 1 .5-.866ZM8 2.45 3.25 5.183v5.634L8 13.55l4.75-2.733V5.183Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1 select-none">
                    Ask AI Detective
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-[280px] select-none">
                    I have context of this workspace's timeline logs, asset lists, and vulnerability findings. Choose a suggestion below:
                  </p>

                  <div className="mt-6 w-full space-y-2 max-w-[320px] text-left select-none">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s, projectId, netfusionContext)}
                        disabled={loading}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 bg-surface-2 border border-border rounded-xl text-[11px] text-foreground hover:border-accent/40 hover:bg-accent/5 transition-colors group disabled:opacity-50"
                      >
                        <span className="text-muted group-hover:text-accent font-semibold">→</span>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeConversation.messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="w-7 h-7 rounded-lg bg-accent-dim border border-accent/20 flex items-center justify-center shrink-0 select-none">
                            🤖
                          </div>
                        )}
                        <div className={`max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm border ${
                              isUser
                                ? "bg-accent border-accent/20 text-background rounded-tr-xs"
                                : "bg-surface-2 border-border text-foreground rounded-tl-xs"
                            }`}
                          >
                            {/* Reasoning header for Assistant Responses */}
                            {!isUser && msg.reasoning && msg.reasoning.steps && msg.reasoning.steps.length > 0 && (
                              <details className="mb-2 p-1.5 bg-surface rounded-lg border border-border select-none">
                                <summary className="cursor-pointer text-[10px] font-semibold text-accent select-none outline-none">
                                  Thought process ({msg.reasoning.confidence}% confidence)
                                </summary>
                                <ul className="mt-1 pl-3.5 list-disc text-[10px] text-text-secondary space-y-0.5">
                                  {msg.reasoning.steps.map((st, sIdx) => (
                                    <li key={sIdx}>{st}</li>
                                  ))}
                                </ul>
                              </details>
                            )}

                            {/* Main Message Content */}
                            {msg.content === "" && loading ? (
                              <div className="flex items-center gap-1 py-1 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                            ) : (
                              <div className="select-text whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
                            )}
                          </div>

                          {/* Message Footer Actions */}
                          {!isUser && msg.content !== "" && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-text-secondary pl-1 select-none">
                              <span>{msg.providerInfo?.provider || activeProvider} • {msg.providerInfo?.latency ? `${msg.providerInfo.latency}ms` : ""}</span>
                              <button
                                onClick={() => retryResponse(msg.id, projectId, netfusionContext)}
                                className="text-accent hover:underline border-none bg-transparent cursor-pointer font-medium"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Active streamed chunk placeholder */}
                  {isStreaming && streamedContent && (
                    <div className="flex gap-3 justify-start animate-fade-in">
                      <div className="w-7 h-7 rounded-lg bg-accent-dim border border-accent/20 flex items-center justify-center shrink-0 select-none">
                        🤖
                      </div>
                      <div className="max-w-[85%] bg-surface-2 border border-border text-foreground rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs leading-relaxed shadow-sm">
                        <div className="select-text whitespace-pre-wrap">{renderMarkdown(streamedContent)}</div>
                        <span className="inline-block w-1.5 h-3.5 bg-accent ml-0.5 animate-pulse rounded-sm align-middle" />
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="shrink-0 px-4 pb-4 pt-3 border-t border-border bg-surface-2 select-none">
              <div className="relative flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this investigation…"
                  disabled={loading && !isStreaming}
                  rows={1}
                  className="flex-1 resize-none bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent transition-colors disabled:opacity-60 min-h-[42px] max-h-[120px] leading-relaxed"
                  style={{ height: "42px" }}
                />
                {loading || isStreaming ? (
                  <button
                    onClick={cancelGeneration}
                    className="w-9 h-9 rounded-xl bg-danger-dim border border-danger/30 flex items-center justify-center text-danger hover:bg-danger hover:text-background transition-colors shrink-0"
                    title="Cancel active generation"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4Z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-background hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    title="Send message"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M1.958 1.457a.5.5 0 0 1 .569-.08l13 6.5a.5.5 0 0 1 0 .894l-13 6.5A.5.5 0 0 1 1.5 14.5v-4.79l7.31-1.46-7.31-1.46V2.5a.5.5 0 0 1 .458-.043Z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-[9px] text-muted mt-2 text-center select-none">
                Enter to send · Shift+Enter for new line · Speed: {typingSpeed}ms
              </p>
            </div>
          </>
        )}

        {/* ─── TAB CONTENT: CONTEXT & MEMORY ─── */}
        {activeTab === "context" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Context size HUD */}
            <div className="bg-surface-2 border border-border rounded-xl p-3.5 space-y-2 select-none">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Context Window HUD</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-surface p-2 rounded border border-border">
                  <div className="text-muted">Window Size</div>
                  <div className="text-sm font-bold text-accent font-mono mt-0.5">{contextSize.toLocaleString()} B</div>
                </div>
                <div className="bg-surface p-2 rounded border border-border">
                  <div className="text-muted">Target Workspace</div>
                  <div className="text-sm font-bold text-foreground truncate mt-0.5">{projectId}</div>
                </div>
              </div>
            </div>

            {/* Checklist of context variables */}
            <div className="space-y-2 select-none">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Active Context Attachments</h3>
              <p className="text-[10px] text-text-secondary">Check the assets or findings to explicitly bind them into the LLM system prompt context.</p>

              {/* Assets checklist */}
              <div className="bg-surface-2 border border-border rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-foreground">Assets in Capture</div>
                {netfusionContext?.hostRiskRanking && netfusionContext.hostRiskRanking.length > 0 ? (
                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                    {netfusionContext.hostRiskRanking.map((host) => {
                      const attached = attachedAssets.includes(host.ip);
                      return (
                        <label key={host.ip} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-surface-hover p-1 rounded">
                          <input
                            type="checkbox"
                            checked={attached}
                            onChange={() => attached ? detachAsset(host.ip) : attachAsset(host.ip)}
                            className="rounded border-border bg-surface text-accent focus:ring-1 focus:ring-accent"
                          />
                          <span className="font-mono text-[11px] truncate flex-1">{host.ip}</span>
                          <span className="text-[10px] bg-danger/10 text-danger border border-danger/20 px-1 rounded font-semibold">
                            Risk {host.score}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted italic">No assets detected in active telemetry.</div>
                )}
              </div>

              {/* Findings checklist */}
              <div className="bg-surface-2 border border-border rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-foreground">Vulnerability Alerts / IOCs</div>
                {netfusionContext?.alerts && netfusionContext.alerts.length > 0 ? (
                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                    {netfusionContext.alerts.map((al, alIdx) => {
                      const id = `f-${alIdx}`;
                      const attached = attachedFindings.includes(id);
                      return (
                        <label key={id} className="flex items-start gap-2 text-xs text-foreground cursor-pointer hover:bg-surface-hover p-1 rounded">
                          <input
                            type="checkbox"
                            checked={attached}
                            onChange={() => attached ? detachFinding(id) : attachFinding(id)}
                            className="mt-0.5 rounded border-border bg-surface text-accent focus:ring-1 focus:ring-accent"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-semibold text-[11px]">{al.title}</div>
                            <div className="text-[9px] text-text-secondary truncate">{al.description}</div>
                          </div>
                          <span className="text-[9px] bg-accent-dim text-accent px-1 rounded uppercase shrink-0">
                            {al.severity}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted italic">No security findings found.</div>
                )}
              </div>
            </div>

            {/* Session Memory List */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider select-none">Session Memory Index</h3>
              <p className="text-[10px] text-text-secondary select-none">Long-term facts or context stored for subsequent chat queries.</p>

              {/* Search Memory */}
              <input
                type="text"
                placeholder="Search memory content..."
                value={searchQuery}
                onChange={(e) => searchMemory(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />

              {/* Memory List */}
              <div className="bg-surface-2 border border-border rounded-xl p-3 space-y-2 max-h-[220px] overflow-y-auto">
                {memoryEntries.length === 0 ? (
                  <div className="text-[10px] text-muted italic text-center py-2 select-none">No memory entries matched search.</div>
                ) : (
                  memoryEntries.map((mem) => (
                    <div key={mem.id} className="bg-surface border border-border p-2 rounded-lg flex items-start gap-2 text-[10px] text-foreground select-text">
                      <div className="flex-1 leading-relaxed">
                        <div>{mem.content}</div>
                        <div className="text-[8px] text-muted mt-1 uppercase font-semibold select-none">
                          Type: {mem.type} • {new Date(mem.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMemory(mem.id)}
                        className="text-danger hover:bg-danger-dim p-0.5 rounded text-xs select-none border-none bg-transparent cursor-pointer"
                        title="Remove memory"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Memory Input */}
              <div className="flex gap-2 select-none">
                <input
                  type="text"
                  placeholder="Record new memory..."
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  className="flex-1 bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (newMemoryText.trim()) {
                      addMemory(newMemoryText.trim(), "long-term");
                      setNewMemoryText("");
                    }
                  }}
                  className="bg-accent text-background text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors border-none cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT: REASONING & PROVIDERS ─── */}
        {activeTab === "reasoning" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Reasoning Steps & Confidence Gauge */}
            <div className="space-y-3 select-none">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Detective Reasoning Logs</h3>

              <div className="bg-surface-2 border border-border rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Analyst Confidence Score</span>
                  <span className="text-xs font-mono font-bold text-success">{confidence}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-success transition-all duration-500"
                    style={{ width: `${confidence}%` }}
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <div className="text-[11px] font-semibold text-foreground">Intermediate Chain:</div>
                  <div className="pl-2 border-l border-accent/20 space-y-1.5 text-[10px] text-text-secondary font-mono">
                    {intermediateChain.length > 0 ? (
                      intermediateChain.map((step, idx) => (
                        <div key={idx} className="flex gap-1.5">
                          <span className="text-accent">•</span>
                          <span>{step}</span>
                        </div>
                      ))
                    ) : (
                      <div className="italic text-muted">No chain logs generated yet.</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border mt-3 text-[10px]">
                  <div className="font-semibold text-foreground">Conclusion:</div>
                  <div className="text-text-secondary mt-0.5">{finalConclusion || "Waiting for prompt input."}</div>
                </div>
              </div>
            </div>

            {/* Providers Settings and Status maps */}
            <div className="space-y-3 select-none">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">AI Provider & Core Settings</h3>

              <div className="bg-surface-2 border border-border rounded-xl p-3.5 space-y-4">
                {/* Switcher Dropdowns */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-text-secondary">Provider</label>
                    <select
                      value={activeProvider}
                      onChange={(e) => switchProvider(e.target.value)}
                      className="w-full bg-surface border border-border rounded px-2 py-1.5 text-foreground"
                    >
                      {providers.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-text-secondary">Model</label>
                    <select
                      value={activeModel}
                      onChange={(e) => switchModel(e.target.value)}
                      className="w-full bg-surface border border-border rounded px-2 py-1.5 text-foreground"
                    >
                      <option value={activeModel}>{activeModel}</option>
                      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                      <option value="claude-3-haiku">claude-3-haiku</option>
                    </select>
                  </div>
                </div>

                {/* Status Dot Map */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-foreground">Provider Status Matrix</div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {Object.entries(providerStatus).map(([provName, status]) => (
                      <div key={provName} className="bg-surface p-1.5 rounded border border-border flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          status === "online" ? "bg-success" : status === "offline" ? "bg-danger" : "bg-accent"
                        }`} />
                        <span className="font-semibold text-foreground truncate">{provName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slider for simulated delay/typingSpeed */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>Typing Animation Speed</span>
                    <span>{typingSpeed} ms/word</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={typingSpeed}
                    onChange={(e) => setTypingSpeed(Number(e.target.value))}
                    className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-accent border-none"
                  />
                </div>
              </div>
            </div>

            {/* Performance Telemetry HUD */}
            <div className="space-y-3 select-none">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Performance Telemetry HUD</h3>
              <div className="bg-surface-2 border border-border rounded-xl p-3.5 grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <div className="text-muted text-[8px]">LATENCY</div>
                  <div className="text-xs font-bold text-accent mt-0.5">{latency !== null ? `${latency} ms` : "0 ms"}</div>
                </div>
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <div className="text-muted text-[8px]">EST. COST</div>
                  <div className="text-xs font-bold text-success mt-0.5">${cost !== null ? cost.toFixed(6) : "0.00"}</div>
                </div>
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <div className="text-muted text-[8px]">TOTAL TOKENS</div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {tokens ? tokens.total : 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT: DEBUG (PROMPT ASSEMBLY) ─── */}
        {activeTab === "debug" && debugEnabled && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 font-mono text-[10px] text-text-secondary select-text">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-sans select-none">Prompt Assembly Inspector</h3>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <span className="text-accent font-semibold select-none">1. System Instruction Prompt:</span>
                <pre className="p-2.5 bg-surface-2 border border-border rounded-lg overflow-x-auto leading-relaxed select-all">
                  {systemPrompt}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-accent font-semibold select-none">2. User Message Prompt:</span>
                <pre className="p-2.5 bg-surface-2 border border-border rounded-lg overflow-x-auto leading-relaxed select-all">
                  {userPrompt}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-accent font-semibold select-none">3. Bound Workspace Context:</span>
                <pre className="p-2.5 bg-surface-2 border border-border rounded-lg overflow-x-auto leading-relaxed select-all">
                  {contextPrompt}
                </pre>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <span className="text-success font-semibold select-none">4. Assembled Groq Query Payload:</span>
                <pre className="p-2.5 bg-surface-2 border border-success/20 rounded-lg overflow-x-auto leading-relaxed select-all text-foreground">
                  {finalPrompt}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
