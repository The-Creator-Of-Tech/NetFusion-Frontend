"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface NoteData {
  id: string;
  content: string;
  updatedAt: string;
  author: { id: string; name: string };
}

interface Props {
  projectId: string;
  initialNote: NoteData | null;
}

// ── Save status indicator ──────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  const config = {
    saving: { dot: "bg-yellow-400", text: "Saving..." },
    saved:  { dot: "bg-success",    text: "Saved"     },
    error:  { dot: "bg-danger",     text: "Save failed" },
  }[status];

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {config.text}
    </span>
  );
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor blur
        onClick();
      }}
      className={`p-1.5 rounded transition-colors text-sm leading-none ${
        active
          ? "bg-accent/15 text-accent"
          : "text-muted hover:text-foreground hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NotesClient({ projectId, initialNote }: Props) {
  const [note, setNote] = useState<NoteData | null>(initialNote);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  // ── Save function ────────────────────────────────────────────────────────────
  const save = useCallback(
    async (html: string) => {
      if (!isDirtyRef.current) return;
      isDirtyRef.current = false;
      setSaveStatus("saving");

      try {
        const res = await fetch(`/api/projects/${projectId}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: html }),
        });

        if (!res.ok) throw new Error("Save failed");

        const data = await res.json();
        setNote({
          ...data.note,
          updatedAt: data.note.updatedAt,
        });
        setSaveStatus("saved");

        // Reset to idle after 3s
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch {
        setSaveStatus("error");
        isDirtyRef.current = true; // allow retry
        setTimeout(() => setSaveStatus("idle"), 4000);
      }
    },
    [projectId]
  );

  // ── Tiptap editor ────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: {},
        bulletList: {},
        orderedList: {},
        bold: {},
        italic: {},
        code: {},
      }),
    ],
    content: initialNote?.content ?? "",
    editorProps: {
      attributes: {
        class:
          "prose-notes min-h-[400px] outline-none px-6 py-5 text-foreground text-sm leading-relaxed",
      },
    },
    onUpdate({ editor }) {
      isDirtyRef.current = true;

      // Debounce auto-save: 30s after last keystroke
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        save(editor.getHTML());
      }, 30_000);
    },
    onBlur({ editor }) {
      // Also save on blur
      if (isDirtyRef.current) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        save(editor.getHTML());
      }
    },
  });

  // Fetch existing note on mount for persistence
  useEffect(() => {
    let isMounted = true;
    if (projectId) {
      fetch(`/api/projects/${projectId}/notes`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.note) {
            setNote(data.note);
            if (editor && !isDirtyRef.current && data.note.content) {
              editor.commands.setContent(data.note.content);
            }
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [projectId, editor]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Toolbar helpers ──────────────────────────────────────────────────────────
  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 h-full flex flex-col space-y-6 bg-[#0b0f19] min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/30 border border-border/40 rounded-xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[10px] font-bold text-accent tracking-wider uppercase bg-accent/10 px-2 py-0.5 rounded border border-accent/20 font-mono">
              SEC-OPS LOG BOOK
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">INVESTIGATION NOTEBOOK</h1>
          {note ? (
            <p className="text-muted text-xs font-semibold">
              Last saved by <span className="text-foreground">{note.author.name}</span> · {formatDate(note.updatedAt)}
            </p>
          ) : (
            <p className="text-muted text-xs">Record active incident findings and mitigation checklists</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={() => {
              if (editor) {
                isDirtyRef.current = true;
                save(editor.getHTML());
              }
            }}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-background px-4 py-2 rounded-lg text-xs font-black transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)]"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
              <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
            </svg>
            Commit Log
          </button>
        </div>
      </div>

      {/* Editor & Sidebar split panel */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Cyberdeck Tiptap Editor */}
        <div className="flex-1 bg-surface/30 border border-border/40 rounded-xl overflow-hidden flex flex-col shadow-lg min-h-[500px]">
          {/* Toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-slate-900/60 flex-wrap">
              {/* Headings */}
              <ToolbarButton
                title="Heading 2"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                H2
              </ToolbarButton>
              <ToolbarButton
                title="Heading 3"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                H3
              </ToolbarButton>

              <div className="w-px h-4 bg-border mx-1" />

              {/* Inline marks */}
              <ToolbarButton
                title="Bold (Ctrl+B)"
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2h4.5a3.501 3.501 0 0 1 2.852 5.53A3.499 3.499 0 0 1 9 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm1 7v3h4a1.5 1.5 0 0 0 0-3Zm3.5-2a1.5 1.5 0 0 0 0-3H5v3Z" />
                </svg>
              </ToolbarButton>
              <ToolbarButton
                title="Italic (Ctrl+I)"
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 2.75A.75.75 0 0 1 6.75 2h6.5a.75.75 0 0 1 0 1.5h-2.505l-3.858 9H9.25a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.505l3.858-9H6.75A.75.75 0 0 1 6 2.75Z" />
                </svg>
              </ToolbarButton>
              <ToolbarButton
                title="Inline code"
                active={editor.isActive("code")}
                onClick={() => editor.chain().focus().toggleCode().run()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </ToolbarButton>

              <div className="w-px h-4 bg-border mx-1" />

              {/* Lists */}
              <ToolbarButton
                title="Bullet list"
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3.75-1.5h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5ZM2 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3.75-1.5h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5ZM2 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3.75-1.5h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5Z" />
                </svg>
              </ToolbarButton>
              <ToolbarButton
                title="Numbered list"
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 3.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 5 3.25Zm0 5a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 5 8.25Zm0 5a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75ZM.924 3.81a.5.5 0 0 1-.204-.31L.5 2.68V2.5a.5.5 0 0 1 .5-.5h.5v2.5H.924ZM2 7.5a.5.5 0 0 1-.5.5H.5a.5.5 0 0 1 0-1h.25V6.5H.5a.5.5 0 0 1 0-1H1a.5.5 0 0 1 .5.5v1.25A.5.5 0 0 1 2 7.5Zm-1.5 4.5h1a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.354-.854L1.293 11H.5a.5.5 0 0 1 0-1h1a.5.5 0 0 1 .354.854L.707 12Z" />
                </svg>
              </ToolbarButton>

              <div className="w-px h-4 bg-border mx-1" />

              {/* Undo / Redo */}
              <ToolbarButton
                title="Undo (Ctrl+Z)"
                onClick={() => editor.chain().focus().undo().run()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.22 6.28a.749.749 0 0 0 0 1.06l3.5 3.5a.749.749 0 1 0 1.06-1.06L3.561 7.5H9.5a3.5 3.5 0 1 1 0 7h-1a.75.75 0 0 0 0 1.5h1a5 5 0 0 0 0-10H3.561l2.22-2.22a.749.749 0 1 0-1.06-1.06l-3.5 3.5Z" />
                </svg>
              </ToolbarButton>
              <ToolbarButton
                title="Redo (Ctrl+Y)"
                onClick={() => editor.chain().focus().redo().run()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06l2.22 2.22H6.5a5 5 0 0 0 0 10h1a.75.75 0 0 0 0-1.5h-1a3.5 3.5 0 1 1 0-7h5.94l-2.22 2.22a.749.749 0 1 0 1.06 1.06l3.5-3.5Z" />
                </svg>
              </ToolbarButton>
            </div>
          )}

          {/* Editor Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-950/20 px-2">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right Side: Analyst Toolkit Panel */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          
          {/* Section: Templates */}
          <div className="bg-surface/30 border border-border/40 rounded-xl p-4 shadow-lg space-y-4">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-border/30">
              <span>📋</span> Notebook Templates
            </h3>
            <p className="text-muted text-[10px] leading-relaxed">
              Inject standard workflow layouts at your current cursor position.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().insertContent(`
                      <h2>Incident Briefing Outline</h2>
                      <p>Briefly describe the anomalous event, detected vectors, and initial impact details.</p>
                      <h3>Investigation Scope</h3>
                      <ul>
                        <li><strong>Primary Subnets:</strong> </li>
                        <li><strong>Affected Systems:</strong> </li>
                      </ul>
                      <h3>Analysis Timeline</h3>
                      <p>Summarize critical chronological steps or forensic activities.</p>
                      <br/>
                    `).run();
                  }
                }}
                className="w-full text-left px-3 py-2 bg-slate-900/60 border border-border/40 hover:border-accent/40 rounded-lg text-xs transition-colors hover:bg-slate-900"
              >
                <div className="font-bold text-foreground">Incident Outline</div>
                <div className="text-[10px] text-muted mt-0.5">Overview, Scope &amp; Steps</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().insertContent(`
                      <h3>Threat IOC Registry</h3>
                      <ul>
                        <li><strong>Indicator:</strong> <code>23.11.215.145</code><br/><strong>Type:</strong> IPv4<br/><strong>Classification:</strong> Malicious C2 / Active Beaconing</li>
                        <li><strong>Indicator:</strong> <code>—</code><br/><strong>Type:</strong> —<br/><strong>Classification:</strong> —</li>
                      </ul>
                      <br/>
                    `).run();
                  }
                }}
                className="w-full text-left px-3 py-2 bg-slate-900/60 border border-border/40 hover:border-accent/40 rounded-lg text-xs transition-colors hover:bg-slate-900"
              >
                <div className="font-bold text-foreground">IOC Evidence Table</div>
                <div className="text-[10px] text-muted mt-0.5">Registry block for indicators</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().insertContent(`
                      <h3>Remediation &amp; Recovery Checklist</h3>
                      <ul>
                        <li>[ ] Isolate suspicious host from subnet segment.</li>
                        <li>[ ] Revoke compromised credentials and tokens.</li>
                        <li>[ ] Apply patch and rebuild affected service container.</li>
                        <li>[ ] Validate egress firewall rule enforcement.</li>
                      </ul>
                      <br/>
                    `).run();
                  }
                }}
                className="w-full text-left px-3 py-2 bg-slate-900/60 border border-border/40 hover:border-accent/40 rounded-lg text-xs transition-colors hover:bg-slate-900"
              >
                <div className="font-bold text-foreground">Mitigation Checklist</div>
                <div className="text-[10px] text-muted mt-0.5">Tactical containment actions</div>
              </button>
            </div>
          </div>

          {/* Section: Metadata & Info */}
          <div className="bg-surface/30 border border-border/40 rounded-xl p-4 shadow-lg space-y-3 font-mono text-[10px]">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest font-sans flex items-center gap-1.5 pb-2 border-b border-border/30">
              <span>🔍</span> Case Metadata
            </h3>
            <div className="space-y-1.5 text-muted">
              <div className="flex justify-between">
                <span>PROJECT ID:</span>
                <span className="text-slate-200">{projectId.slice(0, 13)}...</span>
              </div>
              <div className="flex justify-between">
                <span>CASE STATE:</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>AUTO-SAVE:</span>
                <span className="text-yellow-500">30s debounce</span>
              </div>
            </div>
            <div className="text-[9px] text-muted/60 leading-normal pt-2 border-t border-border/20 font-sans font-mono">
              * Notes are stored locally and committed to the main project database upon manual or automatic save triggers.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
