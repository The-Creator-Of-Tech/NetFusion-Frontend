"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Port {
  port: number;
  state: string;
  service: string;
}

interface TrafficIntelligence {
  topTalkers?: { ip?: string; host?: string; packetsSent?: number; packetsReceived?: number; bytesSent?: number; packets?: number }[];
  top_talkers?: { ip?: string; host?: string; packetsSent?: number; packetsReceived?: number; bytesSent?: number; packets?: number }[];
  topBandwidthConsumers?: { ip?: string; host?: string; bytes?: number; percentage?: number; trafficPercent?: number }[];
  top_bandwidth_consumers?: { ip?: string; host?: string; bytes?: number; percentage?: number; trafficPercent?: number }[];
  topProtocols?: { name?: string; protocol?: string; count?: number; packets?: number; percentage?: number; percent?: number }[];
  protocol_distribution?: { name?: string; protocol?: string; count?: number; packets?: number; percentage?: number; percent?: number }[];
  topExternalDestinations?: { src?: string; dst?: string; host?: string; ip?: string; protocol?: string; packets?: number; bytes?: number; count?: number }[];
  external_communications?: { src?: string; dst?: string; host?: string; ip?: string; protocol?: string; packets?: number; bytes?: number; count?: number }[];
  dns_activity?: { query?: string; count?: number }[];
  topDnsRequesters?: { query?: string; count?: number }[];
  http_activity?: { host?: string; method?: string; uri?: string; count?: number }[];
  topHttpRequesters?: { host?: string; method?: string; uri?: string; count?: number }[];
  internalVsExternal?: {
    internal_packets?: number;
    internal_bytes?: number;
    external_packets?: number;
    external_bytes?: number;
    internalTrafficPercent?: number;
    externalTrafficPercent?: number;
  };
  internal_vs_external?: {
    internal_packets?: number;
    internal_bytes?: number;
    external_packets?: number;
    external_bytes?: number;
  };
  trafficSummary?: {
    totalPackets?: number;
    totalBytes?: number;
    uniqueHosts?: number;
    externalConnections?: number;
  };
}

interface Props {
  projectId: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function TrafficPanel({ projectId }: Props) {
  const [data, setData] = useState<TrafficIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrafficData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/capture-session`);
        if (!res.ok) {
          throw new Error(`Failed to load capture session details: ${res.statusText}`);
        }
        const sessionData = await res.json();
        if (sessionData && sessionData.session) {
          setData(sessionData.session.trafficIntelligence || null);
        }
      } catch (err) {
        console.error("Failed to load traffic intelligence:", err);
        setError("Unable to load traffic intelligence details.");
      } finally {
        setLoading(false);
      }
    }
    if (projectId) {
      loadTrafficData();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted text-sm">Analyzing traffic intelligence data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center max-w-md mx-auto">
        <p className="text-danger text-sm bg-danger-dim border border-danger/20 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-surface border border-border text-foreground hover:bg-surface-2 font-semibold rounded-lg text-xs transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-5 text-muted">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 11.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0-7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm11 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM4 11.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm0-7a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm4-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 10a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-9a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5Z"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">No Traffic Intel Available</h2>
        <p className="text-muted text-sm leading-relaxed mb-6">
          Traffic intelligence reports are generated when you perform a capture session or analyze a PCAP file. Start a session or process a file to see analytics.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/projects/${projectId}/capture`}
            className="px-4 py-2 bg-accent text-background hover:bg-accent-hover font-semibold rounded-lg text-xs transition-colors"
          >
            Go to Live Capture
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/pcap`}
            className="px-4 py-2 bg-surface border border-border text-foreground hover:bg-surface-2 font-semibold rounded-lg text-xs transition-colors"
          >
            Upload PCAP
          </Link>
        </div>
      </div>
    );
  }

  // Calculate high-level values
  const totalPackets = data?.trafficSummary?.totalPackets ?? 
                       ((data?.internal_vs_external?.internal_packets || 0) + (data?.internal_vs_external?.external_packets || 0));

  const totalBytes = data?.trafficSummary?.totalBytes ?? 
                     ((data?.internal_vs_external?.internal_bytes || 0) + (data?.internal_vs_external?.external_bytes || 0));

  const internalPacketPct = data?.internalVsExternal?.internalTrafficPercent ?? 
                            (totalPackets ? roundPct(((data?.internal_vs_external?.internal_packets || 0) / totalPackets) * 100) : 0);
  
  const externalPacketPct = data?.internalVsExternal?.externalTrafficPercent ?? 
                            (totalPackets ? roundPct(((data?.internal_vs_external?.external_packets || 0) / totalPackets) * 100) : 0);

  const internalBytePct = data?.internalVsExternal?.internalTrafficPercent ?? 
                          (totalBytes ? roundPct(((data?.internal_vs_external?.internal_bytes || 0) / totalBytes) * 100) : 0);
  
  const externalBytePct = data?.internalVsExternal?.externalTrafficPercent ?? 
                          (totalBytes ? roundPct(((data?.internal_vs_external?.external_bytes || 0) / totalBytes) * 100) : 0);

  const internalPackets = data?.internal_vs_external?.internal_packets ?? 
                          Math.round((totalPackets * internalPacketPct) / 100);
  
  const externalPackets = data?.internal_vs_external?.external_packets ?? 
                          Math.round((totalPackets * externalPacketPct) / 100);

  const internalBytes = data?.internal_vs_external?.internal_bytes ?? 
                        Math.round((totalBytes * internalBytePct) / 100);
  
  const externalBytes = data?.internal_vs_external?.external_bytes ?? 
                        Math.round((totalBytes * externalBytePct) / 100);

  function roundPct(val: number) {
    return Math.round(val * 100) / 100;
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Traffic Intelligence</h1>
          <p className="text-muted text-sm mt-1">Deep analysis of packet capture streams, talks, protocols, and communication endpoints.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${projectId}/capture`}
            className="px-4 py-2 bg-accent text-background hover:bg-accent-hover font-semibold rounded-lg text-xs transition-colors shrink-0"
          >
            Live Capture
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/pcap`}
            className="px-4 py-2 bg-surface border border-border text-foreground hover:bg-surface-2 font-semibold rounded-lg text-xs transition-colors shrink-0"
          >
            Analyze PCAP
          </Link>
        </div>
      </div>

      {/* Internal vs External and High-level Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Overview cards */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-xl p-4 flex-1">
            <p className="text-xs text-muted mb-1 uppercase tracking-wider font-semibold">Total Packets</p>
            <p className="text-3xl font-bold text-accent font-mono">{totalPackets.toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 flex-1">
            <p className="text-xs text-muted mb-1 uppercase tracking-wider font-semibold">Total Bandwidth</p>
            <p className="text-3xl font-bold text-orange-400 font-mono">{formatBytes(totalBytes)}</p>
          </div>
        </div>

        {/* 7. Internal vs External Traffic Card */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Internal vs External Traffic Breakdown
            </h2>
            
            <div className="space-y-4">
              {/* Packets bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-cyan-400">Internal Packets: {internalPackets.toLocaleString()} ({internalPacketPct}%)</span>
                  <span className="text-purple-400">External Packets: {externalPackets.toLocaleString()} ({externalPacketPct}%)</span>
                </div>
                <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden flex">
                  <div className="h-full bg-cyan-500 transition-all" style={{ width: `${internalPacketPct}%` }} />
                  <div className="h-full bg-purple-500 transition-all" style={{ width: `${externalPacketPct}%` }} />
                </div>
              </div>

              {/* Bandwidth bytes bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-cyan-400">Internal Bytes: {formatBytes(internalBytes)} ({internalBytePct}%)</span>
                  <span className="text-purple-400">External Bytes: {formatBytes(externalBytes)} ({externalBytePct}%)</span>
                </div>
                <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden flex">
                  <div className="h-full bg-cyan-500 transition-all" style={{ width: `${internalBytePct}%` }} />
                  <div className="h-full bg-purple-500 transition-all" style={{ width: `${externalBytePct}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-muted pt-3 border-t border-border mt-4">
            Shows communication internal to the sandbox network (private IP to private IP) versus external packets leaving or entering the perimeter.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Top Talkers */}
        <div className="bg-surface border border-border rounded-xl flex flex-col h-[400px]">
          <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Top Talkers (Packets)</h3>
            <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent font-medium px-2 py-0.5 rounded">
              {(data?.topTalkers || data?.top_talkers)?.length || 0} IPs
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!(data?.topTalkers || data?.top_talkers) || (data?.topTalkers || data?.top_talkers)?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-xs">No active talkers recorded.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 border-b border-border shadow-sm">
                  <tr className="text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">IP Address</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Sent Pkts</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Recv Pkts</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topTalkers || data?.top_talkers)?.map((t, idx) => {
                    const ip = t.ip || t.host || "—";
                    const packetsSent = t.packetsSent ?? t.packets ?? 0;
                    const packetsReceived = t.packetsReceived ?? 0;
                    return (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-cyan-400 font-medium truncate max-w-[150px]">{ip}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">{packetsSent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">{packetsReceived.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 2. Top Bandwidth Consumers */}
        <div className="bg-surface border border-border rounded-xl flex flex-col h-[400px]">
          <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Top Bandwidth Consumers</h3>
            <span className="text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium px-2 py-0.5 rounded">
              {(data?.topBandwidthConsumers || data?.top_bandwidth_consumers)?.length || 0} IPs
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!(data?.topBandwidthConsumers || data?.top_bandwidth_consumers) || (data?.topBandwidthConsumers || data?.top_bandwidth_consumers)?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-xs">No bandwidth data recorded.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 border-b border-border shadow-sm">
                  <tr className="text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">IP Address</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Volume</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Percent</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topBandwidthConsumers || data?.top_bandwidth_consumers)?.map((t, idx) => {
                    const ip = t.ip || t.host || "—";
                    const bytes = t.bytes ?? 0;
                    const percentage = t.percentage ?? t.trafficPercent ?? 0;
                    return (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-cyan-400 font-medium truncate max-w-[180px]">{ip}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground font-semibold">{formatBytes(bytes)}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted">{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 3. Top Protocols */}
        <div className="bg-surface border border-border rounded-xl flex flex-col h-[400px]">
          <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Top Protocols</h3>
            <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium px-2 py-0.5 rounded">
              {(data?.topProtocols || data?.protocol_distribution)?.length || 0} Protocols
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!(data?.topProtocols || data?.protocol_distribution) || (data?.topProtocols || data?.protocol_distribution)?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-xs">No protocols recorded.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 border-b border-border shadow-sm">
                  <tr className="text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Protocol</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Packets</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topProtocols || data?.protocol_distribution)?.map((p, idx) => {
                    const name = p.name || p.protocol || "—";
                    const count = p.count ?? p.packets ?? 0;
                    const percentage = p.percentage ?? p.percent ?? 0;
                    return (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{name}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">{count.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted">{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 4. Top External Destinations */}
        <div className="bg-surface border border-border rounded-xl flex flex-col h-[400px]">
          <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Top External Destinations</h3>
            <span className="text-[10px] bg-danger/10 border border-danger/20 text-danger font-medium px-2 py-0.5 rounded">
              {(data?.topExternalDestinations || data?.external_communications)?.length || 0} Targets
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!(data?.topExternalDestinations || data?.external_communications) || (data?.topExternalDestinations || data?.external_communications)?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-xs">No external boundary traversal observed.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 border-b border-border shadow-sm">
                  <tr className="text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Destination IP</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Connections</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topExternalDestinations || data?.external_communications)?.map((comm, idx) => {
                    const dst = comm.dst || comm.host || comm.ip || "—";
                    const connections = comm.packets ?? comm.count ?? 0;
                    const bytes = comm.bytes ?? 0;
                    return (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-cyan-400 font-medium truncate max-w-[150px]">{dst}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">{connections.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted">{bytes > 0 ? formatBytes(bytes) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 5. DNS Activity */}
        <div className="bg-surface border border-border rounded-xl flex flex-col h-[400px]">
          <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">DNS Activity</h3>
            <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium px-2 py-0.5 rounded">
              {(data?.topDnsRequesters || data?.dns_activity)?.length || 0} Queries
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!(data?.topDnsRequesters || data?.dns_activity) || (data?.topDnsRequesters || data?.dns_activity)?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-xs">No DNS queries recorded in capture.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 border-b border-border shadow-sm">
                  <tr className="text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Queried Domain</th>
                    <th className="px-4 py-2.5 font-semibold text-right w-24">Hits</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topDnsRequesters || data?.dns_activity)?.map((dns, idx) => {
                    const query = dns.query || "—";
                    const count = dns.count ?? 0;
                    return (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-cyan-400 font-medium truncate max-w-[200px]" title={query}>
                          {query}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-foreground font-semibold">{count.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 6. HTTP Activity */}
        <div className="bg-surface border border-border rounded-xl flex flex-col h-[400px]">
          <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">HTTP Activity</h3>
            <span className="text-[10px] bg-success/10 border border-success/20 text-success font-medium px-2 py-0.5 rounded">
              {(data?.topHttpRequesters || data?.http_activity)?.length || 0} Request Logs
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!(data?.topHttpRequesters || data?.http_activity) || (data?.topHttpRequesters || data?.http_activity)?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-xs">No HTTP plaintext web requests logged.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 border-b border-border shadow-sm">
                  <tr className="text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Web Host / URI</th>
                    <th className="px-4 py-2.5 font-semibold">Method</th>
                    <th className="px-4 py-2.5 font-semibold text-right w-20">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topHttpRequesters || data?.http_activity)?.map((http, idx) => {
                    const host = http.host || "—";
                    const method = http.method || "—";
                    const uri = http.uri || "";
                    const count = http.count ?? 0;
                    return (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-cyan-400 font-medium truncate max-w-[160px]" title={`${host}${uri}`}>
                          {host}
                          {uri && <span className="text-slate-500 font-normal text-[11px] block truncate">{uri}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold ${
                            method === "GET" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            method === "POST" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          }`}>
                            {method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-foreground font-semibold">{count.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
