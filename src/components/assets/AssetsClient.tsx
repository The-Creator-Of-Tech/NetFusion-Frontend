"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import AssetSlideOver, { AssetRow } from "./AssetSlideOver";
import CsvImportModal from "./CsvImportModal";
import { investigationStore } from "@/store/investigation";
import { usePagination } from "@/hooks/usePagination";

interface Props {
  projectId: string;
  initialAssets: AssetRow[];
}

const typeColors: Record<string, string> = {
  Server:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Workstation: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Router:      "text-green-400 bg-green-500/10 border-green-500/20",
  Switch:      "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  Firewall:    "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Other:       "text-muted bg-surface-2 border-border",
};

const VENDOR_ICON_MAP: Record<string, string> = {
  dell: "🖥️", apple: "🍎", samsung: "📱", hp: "💻", cisco: "🔗",
  intel: "⚡", windows: "🪟", linux: "🐧", android: "🤖", macos: "💻",
  lenovo: "🖥️", huawei: "📡", asus: "💻", netgear: "📡",
};

function getDeviceIcon(asset: AssetRow): string {
  const v = (asset.hostname || asset.type || "").toLowerCase();
  for (const [key, icon] of Object.entries(VENDOR_ICON_MAP)) {
    if (v.includes(key)) return icon;
  }
  if (asset.type === "Server")      return "🖧";
  if (asset.type === "Workstation") return "🖥️";
  if (asset.type === "Router")      return "📡";
  if (asset.type === "Switch")      return "🔀";
  if (asset.type === "Firewall")    return "🔥";
  return "💻";
}

function getRiskLabel(findingsCount: number): { label: string; cls: string } {
  if (findingsCount === 0) return { label: "Clean",  cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  if (findingsCount <= 2)  return { label: "Low",    cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  if (findingsCount <= 5)  return { label: "Medium", cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" };
  return                          { label: "High",   cls: "text-red-400 bg-red-500/10 border-red-500/20" };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (secs  < 60)  return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AssetsClient({ projectId, initialAssets }: Props) {
  const [storeState, setStoreState] = useState(investigationStore.getState());
  const [slideOpen, setSlideOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"ip" | "hostname" | "risk" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [toast, setToast] = useState("");

  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  useEffect(() => {
    // Seed initialAssets if not present in store
    if (investigationStore.getState().assets.length === 0) {
      investigationStore.setState({ assets: initialAssets as unknown as import('@/types/api').Asset[] });
    }
    const unsubscribe = investigationStore.subscribe((state) => {
      setStoreState(state);
    });
    // Load fresh data
    investigationStore.loadAssets(projectId);
    return () => unsubscribe();
  }, [projectId, initialAssets]);

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (!highlightId) return;
    const target = storeState.assets.find((a) => a.id === highlightId);
    if (target) {
      setSelectedAsset(target as any);
      setSlideOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("highlight");
      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState.assets]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function openAdd() { setSelectedAsset(null); setSlideOpen(true); }
  function openEdit(asset: AssetRow) { setSelectedAsset(asset); setSlideOpen(true); }

  function handleSaved(asset: AssetRow) {
    const exists = storeState.assets.some((a) => a.id === asset.id);
    if (exists) {
      investigationStore.updateAssetInState(asset as any);
    } else {
      investigationStore.addAsset(asset as any);
    }
    showToast(selectedAsset ? "Device updated" : "Device added");
  }

  function handleDeleted(id: string) {
    investigationStore.removeAsset(id);
    showToast("Device deleted");
  }

  function handleImported(count: number) {
    investigationStore.loadAssets(projectId);
    showToast(`${count} device${count !== 1 ? "s" : ""} imported`);
  }

  const assets = storeState.assets as unknown as AssetRow[];

  const filtered = assets.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.ip?.toLowerCase().includes(q) ||
      a.hostname?.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      (Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const getRiskScore = (asset: AssetRow) => asset._count?.findings ?? 0;

  const sorted = [...filtered].sort((a, b) => {
    let valA: any;
    let valB: any;
    if (sortBy === "ip") {
      valA = a.ip || "";
      valB = b.ip || "";
    } else if (sortBy === "hostname") {
      valA = a.hostname || "";
      valB = b.hostname || "";
    } else if (sortBy === "risk") {
      valA = getRiskScore(a);
      valB = getRiskScore(b);
    } else {
      valA = new Date(a.createdAt).getTime();
      valB = new Date(b.createdAt).getTime();
    }

    if (typeof valA === "string") {
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === "asc" ? valA - valB : valB - valA;
  });

  const pagination = usePagination({ initialLimit: 8, initialTotal: sorted.length });

  useEffect(() => {
    pagination.setTotal(sorted.length);
  }, [sorted.length]);

  const paginated = sorted.slice(pagination.offset, pagination.offset + pagination.limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Assets</h1>
          <p className="text-muted text-xs mt-0.5">
            {assets.length} device{assets.length !== 1 ? "s" : ""} in this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCsvOpen(true)}
            className="flex items-center gap-1.5 border border-border text-muted hover:text-foreground hover:border-accent/40 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.75 0h8.5C13.216 0 14 .784 14 1.75v12.5A1.75 1.75 0 0 1 12.25 16h-8.5A1.75 1.75 0 0 1 2 14.25V1.75C2 .784 2.784 0 3.75 0Zm0 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5ZM4.75 4h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-accent text-background px-3 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
            </svg>
            Add Device
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
        </svg>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by hostname, IP, type or tag..."
          className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
        />
      </div>

      {/* Sorting Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-5 text-xs font-semibold text-muted">
        <span>Sort by:</span>
        {[
          { key: "date", label: "Date Added" },
          { key: "ip", label: "IP Address" },
          { key: "hostname", label: "Hostname" },
          { key: "risk", label: "Risk Level" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => {
              if (sortBy === opt.key) {
                setSortOrder(o => o === "asc" ? "desc" : "asc");
              } else {
                setSortBy(opt.key as any);
                setSortOrder("desc");
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
              sortBy === opt.key
                ? "bg-accent/15 border-accent/30 text-accent"
                : "border-border text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            {opt.label} {sortBy === opt.key && (sortOrder === "asc" ? "▲" : "▼")}
          </button>
        ))}
      </div>

      {/* Device Identity Cards */}
      {storeState.loading && assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-muted text-xs">Loading assets...</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-2xl">🖧</div>
          <p className="text-foreground font-medium mb-1">{search ? "No devices match your search" : "No devices yet"}</p>
          <p className="text-muted text-sm mb-4">{search ? "Try a different search term" : "Add your first device to get started"}</p>
          {!search && (
            <button onClick={openAdd} className="bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors">
              Add Device
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((asset) => (
              <DeviceIdentityCard key={asset.id} asset={asset} onClick={() => openEdit(asset)} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 pt-4 mt-6 text-xs text-muted">
              <span>
                Showing {pagination.offset + 1} to {Math.min(sorted.length, pagination.offset + pagination.limit)} of {sorted.length} devices
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={pagination.prevPage}
                  disabled={!pagination.hasPrevPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="font-mono px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={pagination.nextPage}
                  disabled={!pagination.hasNextPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AssetSlideOver projectId={projectId} asset={selectedAsset} open={slideOpen}
        onClose={() => setSlideOpen(false)} onSaved={handleSaved} onDeleted={handleDeleted} />
      <CsvImportModal projectId={projectId} open={csvOpen} onClose={() => setCsvOpen(false)} onImported={handleImported} />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Device Identity Card ───────────────────────────────────────────────────────

function DeviceIdentityCard({ asset, onClick }: { asset: AssetRow; onClick: () => void }) {
  const typeClass = typeColors[asset.type] ?? typeColors.Other;
  const tags = Array.isArray(asset.tags) ? asset.tags : [];
  const risk = getRiskLabel(asset._count.findings);
  const icon = getDeviceIcon(asset);
  const deviceName = asset.hostname || asset.ip || "Unknown Device";
  const isHostname = !!asset.hostname;

  return (
    <div
      onClick={onClick}
      className="bg-surface/30 hover:bg-surface-2/50 border border-border hover:border-accent/40 rounded-2xl p-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md group flex flex-col gap-3"
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-surface-2/80 border border-border flex items-center justify-center text-xl shrink-0">
          {icon}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${typeClass}`}>{asset.type}</span>
      </div>

      {/* Primary name */}
      <div>
        <h3 className={`font-bold text-sm leading-tight group-hover:text-accent transition-colors ${isHostname ? "text-foreground" : "font-mono text-cyan-400"}`}>
          {deviceName}
        </h3>
        {asset.hostname && asset.ip && (
          <p className="font-mono text-[11px] text-cyan-500/80 mt-0.5">{asset.ip}</p>
        )}
        {!asset.hostname && !asset.ip && (
          <p className="text-muted/40 text-xs italic mt-0.5">no identifier</p>
        )}
      </div>

      <div className="border-t border-border/40" />

      {/* Identity grid */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted/70 text-[10px] uppercase tracking-wider font-semibold">MAC</span>
          <span className="font-mono text-[11px] text-muted/40 italic">—</span>
        </div>
        {asset.ip && (
          <div className="flex items-center justify-between">
            <span className="text-muted/70 text-[10px] uppercase tracking-wider font-semibold">Current IP</span>
            <span className="font-mono text-[11px] text-cyan-400">{asset.ip}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted/70 text-[10px] uppercase tracking-wider font-semibold">Risk</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${risk.cls}`}>{risk.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted/70 text-[10px] uppercase tracking-wider font-semibold">Last Seen</span>
          <span className="text-[11px] text-muted">{relativeTime(asset.createdAt)}</span>
        </div>
        {asset._count.findings > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted/70 text-[10px] uppercase tracking-wider font-semibold">Findings</span>
            <span className="text-xs font-black text-orange-400">{asset._count.findings}</span>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2/60 border border-border text-muted">{tag}</span>
          ))}
          {tags.length > 3 && <span className="text-[10px] text-muted font-mono">+{tags.length - 3}</span>}
        </div>
      )}
    </div>
  );
}
