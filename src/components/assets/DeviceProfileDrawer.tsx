"use client";

import { useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeviceIdentity {
  // Core identity
  ip: string;
  hostname?: string | null;
  mac?: string | null;
  vendor?: string | null;
  os?: string | null;
  deviceType?: string | null;
  // IP history (oldest → newest, last item = current)
  ipHistory?: string[];
  // Risk
  riskScore?: number;
  riskReasons?: string[];
  status?: "online" | "offline" | "unknown";
  // Traffic
  packets?: number;
  connections?: number;
  lastSeen?: string;
  // Enrichment from agent
  org?: string | null;
  country?: string | null;
  classification?: string | null;
  summary?: string | null;
  // Behavioral profiling
  deviceProfile?: {
    device_type?: string;
    confidence?: string;
    likely_activities?: string[];
    observed_domains?: string[];
    recommendations?: string[];
    narrative?: string;
  } | null;
  // Security data
  findings?: DeviceFinding[];
  alerts?: DeviceAlert[];
  timeline?: DeviceTimelineEvent[];
}

export interface DeviceFinding {
  id?: string;
  type: string;
  severity: string;
  description: string;
  createdAt?: string;
}

export interface DeviceAlert {
  title: string;
  severity: string;
  description?: string;
}

export interface DeviceTimelineEvent {
  time?: string;
  title: string;
  description?: string;
  type?: string;
  severity?: string;
  src?: string;
  dst?: string;
  protocol?: string;
}

interface Props {
  open: boolean;
  device: DeviceIdentity | null;
  loading?: boolean;
  onClose: () => void;
  onNavigateToHost?: (ip: string) => void;
}

type DrawerTab = "overview" | "findings" | "alerts" | "timeline" | "notes";

// ── Vendor logo map ────────────────────────────────────────────────────────────

const VENDOR_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  dell:    { icon: "🖥️",  color: "text-blue-300",   bg: "bg-blue-500/10 border-blue-500/20" },
  apple:   { icon: "🍎",  color: "text-gray-300",   bg: "bg-gray-500/10 border-gray-500/20" },
  samsung: { icon: "📱",  color: "text-cyan-300",   bg: "bg-cyan-500/10 border-cyan-500/20" },
  hp:      { icon: "💻",  color: "text-indigo-300", bg: "bg-indigo-500/10 border-indigo-500/20" },
  cisco:   { icon: "🔗",  color: "text-green-300",  bg: "bg-green-500/10 border-green-500/20" },
  intel:   { icon: "⚡",  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-400/20" },
  windows: { icon: "🪟",  color: "text-sky-300",    bg: "bg-sky-500/10 border-sky-500/20" },
  linux:   { icon: "🐧",  color: "text-yellow-300", bg: "bg-yellow-500/10 border-yellow-500/20" },
  android: { icon: "🤖",  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  macos:   { icon: "💻",  color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  huawei:  { icon: "📡",  color: "text-red-300",    bg: "bg-red-500/10 border-red-500/20" },
  lenovo:  { icon: "🖥️",  color: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/20" },
  asus:    { icon: "💻",  color: "text-blue-300",   bg: "bg-blue-500/10 border-blue-500/20" },
  "tp-link": { icon: "📡",  color: "text-green-300",  bg: "bg-green-500/10 border-green-500/20" },
  netgear: { icon: "📡",  color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  default: { icon: "🖧",  color: "text-slate-400",  bg: "bg-slate-800 border-slate-700" },
};

function getVendorInfo(vendor?: string | null) {
  if (!vendor) return VENDOR_ICONS.default;
  const v = vendor.toLowerCase();
  for (const [key, val] of Object.entries(VENDOR_ICONS)) {
    if (key !== "default" && v.includes(key)) return val;
  }
  return VENDOR_ICONS.default;
}

// ── OS detection ───────────────────────────────────────────────────────────────

function getOsIcon(os?: string | null): string {
  if (!os) return "❓";
  const o = os.toLowerCase();
  if (o.includes("windows")) return "🪟";
  if (o.includes("linux") || o.includes("ubuntu") || o.includes("debian")) return "🐧";
  if (o.includes("mac") || o.includes("darwin")) return "🍎";
  if (o.includes("android")) return "🤖";
  if (o.includes("ios") || o.includes("iphone")) return "📱";
  if (o.includes("cisco") || o.includes("ios xe")) return "🔗";
  return "💾";
}

// ── Risk helpers ───────────────────────────────────────────────────────────────

function getRiskConfig(score: number) {
  if (score >= 70) return { label: "Critical", color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",     bar: "bg-red-500" };
  if (score >= 50) return { label: "High",     color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/30", bar: "bg-orange-500" };
  if (score >= 30) return { label: "Medium",   color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30", bar: "bg-yellow-500" };
  if (score > 0)   return { label: "Low",      color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30",   bar: "bg-blue-500" };
  return              { label: "Clean",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", bar: "bg-emerald-500" };
}

function getSeverityConfig(sev: string) {
  const s = (sev ?? "").toUpperCase();
  if (s === "CRITICAL") return "text-red-400 bg-red-500/10 border-red-500/20";
  if (s === "HIGH")     return "text-orange-400 bg-orange-500/10 border-orange-500/20";
  if (s === "MEDIUM")   return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  if (s === "LOW")      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  return "text-slate-400 bg-slate-800 border-slate-700";
}

// ── Device name helper (exported for reuse) ────────────────────────────────────

export function getDeviceName(d: Pick<DeviceIdentity, "hostname" | "mac" | "ip">): string {
  return d.hostname || d.mac || d.ip;
}

// ── IP History chain ───────────────────────────────────────────────────────────

function IpHistoryChain({ history, current }: { history: string[]; current: string }) {
  const allIps = [...history.filter((ip) => ip !== current), current];
  if (allIps.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-cyan-400">{current}</span>
        <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-semibold">
          Current
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {allIps.map((ip, idx) => {
        const isCurrent = idx === allIps.length - 1;
        return (
          <div key={ip + idx} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-2 h-2 rounded-full border-2 mt-1.5 ${
                  isCurrent ? "bg-cyan-400 border-cyan-400" : "bg-slate-700 border-slate-600"
                }`}
              />
              {idx < allIps.length - 1 && (
                <div className="w-px h-5 bg-slate-700" />
              )}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span
                className={`font-mono text-xs ${
                  isCurrent ? "text-cyan-400 font-bold" : "text-slate-500 line-through"
                }`}
              >
                {ip}
              </span>
              {isCurrent && (
                <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-semibold">
                  Current
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 min-w-[76px]">
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[#F8FAFC] font-bold text-sm">{value}</span>
      <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, label, count,
}: {
  active: boolean; onClick: () => void; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap ${
        active
          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
          : "text-slate-400 hover:text-[#F8FAFC] hover:bg-slate-700/50"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
            active ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-700 text-slate-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main Drawer ────────────────────────────────────────────────────────────────

export default function DeviceProfileDrawer({
  open, device, loading = false, onClose, onNavigateToHost,
}: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setActiveTab("overview");
  }, [open, device?.ip]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;

  const deviceName = device ? getDeviceName(device) : "Unknown Device";
  const riskScore = device?.riskScore ?? 0;
  const risk = getRiskConfig(riskScore);
  const vendor = getVendorInfo(device?.vendor || device?.deviceType || device?.deviceProfile?.device_type);
  const osIcon = getOsIcon(device?.os || device?.deviceProfile?.device_type);
  const ipHistory = device?.ipHistory ?? [];
  const findings = device?.findings ?? [];
  const alerts = device?.alerts ?? [];
  const timelineEvents = device?.timeline ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-xl bg-[#0B1020] border-l border-slate-700/60 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in"
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-700/50 space-y-3 bg-gradient-to-b from-slate-900/80 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Vendor badge */}
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shrink-0 ${vendor.bg}`}
              >
                {vendor.icon}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-base text-[#F8FAFC] tracking-tight leading-tight truncate max-w-[220px]">
                    {loading ? (
                      <span className="inline-block h-4 w-36 rounded bg-slate-700 animate-pulse" />
                    ) : deviceName}
                  </h2>
                  {device?.os && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-600 text-slate-400 font-mono flex items-center gap-1 shrink-0">
                      {osIcon} {device.os}
                    </span>
                  )}
                </div>

                {/* Sub label */}
                {device && (device.vendor || device.deviceProfile?.device_type) && (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {device.vendor || device.deviceProfile?.device_type}
                  </p>
                )}

                {/* Current IP */}
                {device && (
                  <p className="font-mono text-[11px] text-cyan-500 mt-0.5">{device.ip}</p>
                )}

                {/* Badges row */}
                {device && !loading && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${risk.bg} ${risk.color}`}>
                      {risk.label} Risk
                    </span>
                    {device.status && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                          device.status === "online"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : device.status === "offline"
                            ? "text-red-400 bg-red-500/10 border-red-500/20"
                            : "text-slate-400 bg-slate-800 border-slate-700"
                        }`}
                      >
                        {device.status === "online" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        {device.status}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-[#F8FAFC] transition-colors p-1.5 rounded-lg hover:bg-slate-700/50 shrink-0"
              aria-label="Close device profile"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>

          {/* Stats pills */}
          {device && !loading && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              <StatPill label="Packets"     value={device.packets?.toLocaleString() ?? "—"} icon="📦" />
              <StatPill label="Connections" value={device.connections ?? "—"}               icon="🔗" />
              <StatPill label="Risk"        value={riskScore}                                icon="🛡️" />
              {device.lastSeen && (
                <StatPill label="Last Seen" value={device.lastSeen}                         icon="🕒" />
              )}
            </div>
          )}
          {loading && (
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-20 rounded-xl bg-slate-800 animate-pulse flex-shrink-0" />
              ))}
            </div>
          )}
        </div>

        {/* ── TABS ───────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-4 py-2 border-b border-slate-700/40 flex items-center gap-1 overflow-x-auto bg-slate-900/40">
          <TabButton active={activeTab === "overview"}  onClick={() => setActiveTab("overview")}  label="Overview" />
          <TabButton active={activeTab === "findings"}  onClick={() => setActiveTab("findings")}  label="Findings"  count={findings.length} />
          <TabButton active={activeTab === "alerts"}    onClick={() => setActiveTab("alerts")}    label="Alerts"    count={alerts.length} />
          <TabButton active={activeTab === "timeline"}  onClick={() => setActiveTab("timeline")}  label="Timeline"  count={timelineEvents.length} />
          <TabButton active={activeTab === "notes"}     onClick={() => setActiveTab("notes")}     label="Notes" />
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-${i === 1 ? "16" : "10"} rounded-lg bg-slate-800 animate-pulse`} />
              ))}
            </div>
          ) : !device ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 text-sm">No device selected.</p>
            </div>
          ) : (
            <>
              {/* ── OVERVIEW ─────────────────────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="p-5 space-y-4">

                  {/* Identity card */}
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device Identity</h3>
                    <div className="space-y-2 text-xs">
                      {([
                        { label: "Device Name",      value: deviceName,                                            mono: false },
                        { label: "Hostname",         value: device.hostname    ?? "--",                           mono: false },
                        { label: "MAC Address",      value: device.mac         ?? "--",                           mono: true  },
                        { label: "Vendor",           value: (device.vendor || device.deviceProfile?.device_type) ?? "--", mono: false },
                        { label: "Operating System", value: device.os,          mono: false },
                        { label: "Organization",     value: device.org,         mono: false },
                        { label: "Country",          value: device.country,     mono: false },
                        { label: "Classification",   value: device.classification, mono: false },
                      ] as { label: string; value?: string | null; mono: boolean }[]).map(({ label, value, mono }) => {
                        // Always render the first four identity fields; skip others if null
                        const alwaysShow = ["Device Name", "Hostname", "MAC Address", "Vendor"].includes(label);
                        if (!alwaysShow && !value) return null;
                        return (
                          <div
                            key={label}
                            className="flex justify-between items-start gap-4 pb-2 border-b border-slate-800/60 last:border-0 last:pb-0"
                          >
                            <span className="text-slate-400 shrink-0">{label}</span>
                            <span className={`font-semibold text-right break-all ${
                              value === "--"
                                ? "text-slate-500"
                                : mono
                                ? "font-mono text-cyan-400"
                                : "text-[#F8FAFC]"
                            }`}>
                              {value ?? "--"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* IP History */}
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IP History</h3>
                    <IpHistoryChain history={ipHistory} current={device.ip} />
                  </div>

                  {/* Risk evidence */}
                  {device.riskReasons && device.riskReasons.length > 0 && (
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Evidence</h3>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${risk.bar}`} style={{ width: `${Math.min(riskScore, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${risk.color}`}>{riskScore}/100</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {device.riskReasons.map((r, i) => (
                          <span key={i} className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-xs border border-slate-700">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Behavioral Profile */}
                  {device.deviceProfile && (
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Behavioral Profile</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {device.deviceProfile.device_type && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">Device Type</span>
                            <span className="text-[#F8FAFC] font-semibold">{device.deviceProfile.device_type}</span>
                          </div>
                        )}
                        {device.deviceProfile.confidence && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">Confidence</span>
                            <span className={`font-semibold ${String(device.deviceProfile.confidence).toLowerCase() === "high" ? "text-emerald-400" : "text-yellow-400"}`}>
                              {device.deviceProfile.confidence}
                            </span>
                          </div>
                        )}
                      </div>
                      {device.deviceProfile.likely_activities && device.deviceProfile.likely_activities.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Likely Activities</span>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {device.deviceProfile.likely_activities.map((a, i) => (
                              <li key={i} className="flex gap-1.5"><span className="text-cyan-500 shrink-0">›</span>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {device.deviceProfile.observed_domains && device.deviceProfile.observed_domains.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Observed Domains</span>
                          <div className="flex flex-wrap gap-1">
                            {device.deviceProfile.observed_domains.map((d, i) => (
                              <span key={i} className="bg-cyan-950/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/30 font-mono text-[10px]">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {device.deviceProfile.recommendations && device.deviceProfile.recommendations.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Recommendations</span>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {device.deviceProfile.recommendations.map((r, i) => (
                              <li key={i} className="flex gap-1.5"><span className="text-orange-400 shrink-0">!</span>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {device.deviceProfile.narrative && (
                        <p className="text-[11px] text-slate-300 italic bg-slate-800/60 p-3 rounded-xl border border-slate-700/40 leading-relaxed">
                          {device.deviceProfile.narrative}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reputation summary */}
                  {device.summary && (
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 space-y-2">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reputation Summary</h3>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">{device.summary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── FINDINGS ─────────────────────────────────────────────── */}
              {activeTab === "findings" && (
                <div className="p-5">
                  {findings.length === 0 ? (
                    <EmptyTab icon="✅" title="No findings" sub="Security findings will appear here" />
                  ) : (
                    <ul className="space-y-2">
                      {findings.map((f, i) => (
                        <li key={f.id || i} className="flex items-start gap-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 hover:border-slate-600/60 transition-colors">
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${getSeverityConfig(f.severity)}`}>
                            {(f.severity ?? "?").slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#F8FAFC]">{f.type}</p>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.description}</p>
                            {f.createdAt && (
                              <p className="text-[10px] text-slate-500 mt-1">{new Date(f.createdAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── ALERTS ───────────────────────────────────────────────── */}
              {activeTab === "alerts" && (
                <div className="p-5">
                  {alerts.length === 0 ? (
                    <EmptyTab icon="🟢" title="No alerts" sub="Security alerts will appear here" />
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((a, i) => (
                        <div
                          key={i}
                          className={`border-l-4 pl-3 py-2 rounded-r-xl bg-slate-900/40 ${
                            String(a.severity).toLowerCase().includes("high") || String(a.severity).toLowerCase().includes("critical")
                              ? "border-red-500"
                              : String(a.severity).toLowerCase().includes("medium")
                              ? "border-orange-500"
                              : "border-blue-500"
                          }`}
                        >
                          <p className="text-sm font-semibold text-[#F8FAFC]">{a.title}</p>
                          {a.description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{a.description}</p>}
                          <span className={`text-[10px] font-bold uppercase mt-1.5 inline-block ${getSeverityConfig(a.severity)} px-1.5 py-0.5 rounded border`}>
                            {a.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TIMELINE ─────────────────────────────────────────────── */}
              {activeTab === "timeline" && (
                <div className="p-5">
                  {timelineEvents.length === 0 ? (
                    <EmptyTab icon="📋" title="No timeline events" sub="Events will appear here as they occur" />
                  ) : (
                    <div className="space-y-1">
                      {timelineEvents.map((ev, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-2 h-2 rounded-full mt-1.5 border-2 ${
                              ev.severity === "high" || ev.severity === "critical"
                                ? "border-red-400 bg-red-500"
                                : ev.severity === "medium"
                                ? "border-orange-400 bg-orange-500"
                                : "border-cyan-500 bg-cyan-400"
                            }`} />
                            {i < timelineEvents.length - 1 && <div className="w-px flex-1 bg-slate-800 mt-1 min-h-[1.5rem]" />}
                          </div>
                          <div className="pb-3 min-w-0">
                            {ev.time && <p className="text-[10px] text-slate-500">{ev.time}</p>}
                            <p className="text-xs font-semibold text-[#F8FAFC] mt-0.5">{ev.title}</p>
                            {ev.description && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{ev.description}</p>}
                            {(ev.src || ev.dst) && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {ev.src && <span className="font-mono text-[10px] text-cyan-400">{ev.src}</span>}
                                {ev.src && ev.dst && <span className="text-slate-600 text-[10px]">→</span>}
                                {ev.dst && <span className="font-mono text-[10px] text-cyan-400">{ev.dst}</span>}
                                {ev.protocol && (
                                  <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-1 py-0.5 rounded">{ev.protocol}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── NOTES ────────────────────────────────────────────────── */}
              {activeTab === "notes" && (
                <div className="p-5">
                  <EmptyTab icon="📝" title="Notes" sub="Use the Asset editor to add notes to this device" />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-700/50 flex gap-2 bg-slate-900/40">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-600 text-slate-300 hover:text-[#F8FAFC] hover:border-slate-500 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
          {device && onNavigateToHost && (
            <button
              onClick={() => onNavigateToHost(device.ip)}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg"
            >
              🔍 Full Investigation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared empty state ─────────────────────────────────────────────────────────

function EmptyTab({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
      <span className="text-3xl">{icon}</span>
      <p className="text-slate-300 text-sm font-medium">{title}</p>
      <p className="text-slate-500 text-xs">{sub}</p>
    </div>
  );
}
