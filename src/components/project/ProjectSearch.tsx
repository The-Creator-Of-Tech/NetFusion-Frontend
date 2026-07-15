"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AssetRecord {
  id: string;
  ip: string | null;
  hostname: string | null;
  type: string;
  tags: unknown; // JSON from Prisma
  notes: string | null;
}

interface FindingRecord {
  id: string;
  type: string;
  severity: string;
  description: string;
}

interface NoteRecord {
  id: string;
  content: string; // HTML
}

interface SearchIndex {
  assets: AssetRecord[];
  findings: FindingRecord[];
  note: NoteRecord | null;
}

type ResultKind = "asset" | "finding" | "note";

interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
  HIGH:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
  MEDIUM:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  LOW:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
  INFO:     "text-muted bg-surface-2 border-border",
};

function matchSubstring(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function runSearch(index: SearchIndex, query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const results: SearchResult[] = [];

  // Assets
  for (const a of index.assets) {
    const tags = parseTags(a.tags);
    const matches =
      (a.ip         && matchSubstring(a.ip,         q)) ||
      (a.hostname   && matchSubstring(a.hostname,   q)) ||
      matchSubstring(a.type, q)                         ||
      tags.some((t) => matchSubstring(t, q))            ||
      (a.notes      && matchSubstring(a.notes,      q));

    if (matches) {
      results.push({
        id:       a.id,
        kind:     "asset",
        title:    a.ip ?? a.hostname ?? a.type,
        subtitle: [a.hostname ?? a.ip, a.type, ...(tags.slice(0, 2))]
                    .filter(Boolean)
                    .join(" · "),
        badge:    a.type,
      });
    }
  }

  // Findings
  for (const f of index.findings) {
    const matches =
      matchSubstring(f.type,        q) ||
      matchSubstring(f.description, q) ||
      matchSubstring(f.severity,    q);

    if (matches) {
      results.push({
        id:          f.id,
        kind:        "finding",
        title:       f.type,
        subtitle:    f.description.length > 80
                       ? f.description.slice(0, 80) + "…"
                       : f.description,
        badge:       f.severity,
        badgeColor:  SEV_COLORS[f.severity] ?? SEV_COLORS.INFO,
      });
    }
  }

  // Note (single doc — search plain text)
  if (index.note) {
    const plain = stripHtml(index.note.content);
    if (matchSubstring(plain, q)) {
      // Find the surrounding snippet
      const lower = plain.toLowerCase();
      const idx   = lower.indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 30);
      const end   = Math.min(plain.length, idx + q.length + 50);
      const snippet = (start > 0 ? "…" : "") + plain.slice(start, end) + (end < plain.length ? "…" : "");

      results.push({
        id:       "notes",
        kind:     "note",
        title:    "Investigation Notes",
        subtitle: snippet,
      });
    }
  }

  return results;
}

// ── Result icon ────────────────────────────────────────────────────────────────

function ResultIcon({ kind }: { kind: ResultKind }) {
  if (kind === "asset") {
    return (
      <span className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.5h-13v6.751Zm13-8.751H1.5v-.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v.75Z" />
        </svg>
      </span>
    );
  }
  if (kind === "finding") {
    return (
      <span className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.533.133a1.75 1.75 0 0 0-1.066 0l-5.25 1.68A1.75 1.75 0 0 0 1 3.48V7c0 1.566.32 3.182 1.303 4.682.983 1.498 2.585 2.813 5.032 3.855a1.697 1.697 0 0 0 1.33 0c2.447-1.042 4.049-2.357 5.032-3.855C14.68 10.182 15 8.566 15 7V3.48a1.75 1.75 0 0 0-1.217-1.667ZM8.75 4.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 1.5 0ZM8 10.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M0 3.75A.75.75 0 0 1 .75 3h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 3.75Zm0 4A.75.75 0 0 1 .75 7h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 7.75Zm0 4a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Z" />
      </svg>
    </span>
  );
}

// ── Group label ────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<ResultKind, string> = {
  asset:   "Assets",
  finding: "Findings",
  note:    "Notes",
};

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
}

export default function ProjectSearch({ projectId }: Props) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [index,    setIndex]    = useState<SearchIndex | null>(null);
  const [active,   setActive]   = useState(-1); // keyboard nav index

  // Build results from current query + index
  const results = index ? runSearch(index, query) : [];

  // Group by kind preserving order: assets → findings → notes
  const grouped: { kind: ResultKind; label: string; items: SearchResult[] }[] = [];
  const kindOrder: ResultKind[] = ["asset", "finding", "note"];
  for (const kind of kindOrder) {
    const items = results.filter((r) => r.kind === kind);
    if (items.length) grouped.push({ kind, label: KIND_LABELS[kind], items });
  }

  // Flat list for keyboard nav
  const flatResults = results;

  // ── Fetch index on first focus ──────────────────────────────────────────────
  const fetchIndex = useCallback(async () => {
    if (index) return; // already loaded
    setLoading(true);
    try {
      const res  = await fetch(`/api/projects/${projectId}/search`);
      const data = await res.json();
      setIndex(data);
    } catch {
      // silently fail — search just won't return results
    } finally {
      setLoading(false);
    }
  }, [projectId, index]);

  // ── Global Cmd+K / Ctrl+K shortcut ─────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
        fetchIndex();
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchIndex]);

  // ── Click outside to close ──────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset active index when results change
  useEffect(() => { setActive(-1); }, [query]);

  // ── Navigate to result ──────────────────────────────────────────────────────
  function navigate(result: SearchResult) {
    setOpen(false);
    setQuery("");

    const base = `/dashboard/projects/${projectId}`;
    if (result.kind === "asset") {
      router.push(`${base}/assets?highlight=${result.id}`);
    } else if (result.kind === "finding") {
      router.push(`${base}/findings?highlight=${result.id}`);
    } else {
      router.push(`${base}/notes?highlight=notes`);
    }
  }

  // ── Keyboard nav in dropdown ────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = active >= 0 ? flatResults[active] : flatResults[0];
      if (target) navigate(target);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative flex items-center">
        <svg
          width="13" height="13" viewBox="0 0 16 16" fill="currentColor"
          className="absolute left-2.5 text-muted pointer-events-none"
        >
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            fetchIndex();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search project…"
          className="w-52 bg-surface-2 border border-border rounded-lg pl-8 pr-14 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent focus:w-72 transition-all duration-200"
          aria-label="Search project"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
          aria-autocomplete="list"
        />
        {/* Kbd hint */}
        <span className="absolute right-2.5 flex items-center gap-0.5 pointer-events-none">
          {query ? (
            <button
              type="button"
              className="pointer-events-auto text-muted hover:text-foreground transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          ) : (
            <kbd className="text-[10px] text-muted bg-surface border border-border rounded px-1 py-0.5 font-mono leading-none">
              ⌘K
            </kbd>
          )}
        </span>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 mt-1.5 w-96 max-h-[420px] overflow-y-auto bg-surface border border-border rounded-xl shadow-2xl z-50 animate-fade-in"
          role="listbox"
          aria-label="Search results"
        >
          {loading && !index ? (
            <div className="px-4 py-8 text-center text-xs text-muted">
              Loading…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted">No results for</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">"{query}"</p>
            </div>
          ) : (
            <div className="py-1">
              {grouped.map(({ kind, label, items }) => {
                return (
                  <div key={kind}>
                    {/* Group header */}
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {label}
                      </span>
                    </div>

                    {/* Items */}
                    {items.map((result) => {
                      const flatIdx = flatResults.indexOf(result);
                      const isActive = flatIdx === active;

                      return (
                        <button
                          key={result.id}
                          role="option"
                          aria-selected={isActive}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigate(result);
                          }}
                          onMouseEnter={() => setActive(flatIdx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            isActive ? "bg-surface-2" : "hover:bg-surface-2/60"
                          }`}
                        >
                          <ResultIcon kind={result.kind} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">
                                {result.title}
                              </span>
                              {result.badge && (
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                                    result.badgeColor ?? "text-muted bg-surface-2 border-border"
                                  }`}
                                >
                                  {result.badge}
                                </span>
                              )}
                            </div>
                            {result.subtitle && (
                              <p className="text-xs text-muted truncate mt-0.5">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          {/* Arrow hint */}
                          {isActive && (
                            <svg
                              width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
                              className="text-muted shrink-0"
                            >
                              <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Footer hint */}
              <div className="px-3 py-2 border-t border-border mt-1 flex items-center gap-3 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <kbd className="bg-surface-2 border border-border rounded px-1 font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-surface-2 border border-border rounded px-1 font-mono">↵</kbd>
                  open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-surface-2 border border-border rounded px-1 font-mono">Esc</kbd>
                  close
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
