"use client";

import { useState, useEffect } from "react";
import IPAddress from "@/components/IPAddress";

function ProtocolBadge({ protocol }: { protocol: string }) {
  const colors: Record<string, string> = {
    TCP:      "bg-blue-500/15 text-blue-400",
    UDP:      "bg-purple-500/15 text-purple-400",
    "TLSv1.2": "bg-green-500/15 text-green-400",
    SSL:      "bg-yellow-500/15 text-yellow-400",
    QUIC:     "bg-cyan-500/15 text-cyan-400",
    DNS:      "bg-pink-500/15 text-pink-400",
  };
  return (
    <span
      className={`px-2 py-1 rounded-md text-xs font-medium ${
        colors[protocol] ?? "bg-gray-500/15 text-gray-300"
      }`}
    >
      {protocol}
    </span>
  );
}

function generateSummary(result: AnalysisResult | null): string[] {
  if (!result) return [];

  const summary: string[] = [];

  const topProtocol = Object.entries(result.protocols || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))[0];

  const topSource      = result.top_sources?.[0];
  const topDestination = result.top_destinations?.[0];

  summary.push(`Total packets analyzed: ${result.total_packets.toLocaleString()}`);

  if (topProtocol) {
    summary.push(`Most common protocol: ${topProtocol[0]} (${topProtocol[1]} packets)`);
  }

  summary.push(`${result.conversation_count} conversations detected`);

  if (topSource) {
    summary.push(`Primary source: ${topSource.ip}`);
  }

  if (topDestination) {
    summary.push(`Primary destination: ${topDestination.ip}`);
  }

  if (
    result.protocols?.["TLSv1.2"] ||
    result.protocols?.["SSL"] ||
    result.protocols?.["QUIC"]
  ) {
    summary.push("Encrypted traffic observed");
  }

  return summary;
}

interface Packet {
  number: string;
  time: string;
  src: string;
  dst: string;
  protocol: string;
  length: string;
  info: string;
}

interface AnalysisResult {
  total_packets: number;
  protocols: Record<string, number>;
  conversation_count: number;
  conversations: {
    src: string;
    dst: string;
    protocol: string;
    packets: number;
  }[];
  top_sources: {
    ip: string;
    packets: number;
  }[];
  top_destinations: {
    ip: string;
    packets: number;
  }[];
  packets?: Packet[];
  packet_count?: number;
}

interface PcapPanelProps {
  projectId?: string;
}

export default function PcapPanel({ projectId }: PcapPanelProps) {
  const [file,           setFile]           = useState<File | null>(null);
  const [result,         setResult]         = useState<AnalysisResult | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [search,         setSearch]         = useState("");
  const [selectedPacket,   setSelectedPacket]   = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [packetDetails,  setPacketDetails]  = useState("");
  const [loadingPacket,  setLoadingPacket]  = useState(false);
  const [streamData,     setStreamData]     = useState("");
  const [streamId,       setStreamId]       = useState("");
  const [dnsDomains,     setDnsDomains]     = useState<string[]>([]);
  const [aiSummary,      setAiSummary]      = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [findings,       setFindings]       = useState<{ type: string; severity: string; description?: string; asset?: string; date?: string }[]>([]);
  const [iocs,           setIocs]           = useState<{ type: string; severity: string; description?: string; asset?: string }[]>([]);
  const [selectedIp,     setSelectedIp]     = useState<any>(null);
  const [reputation,     setReputation]     = useState<any>(null);
  const [correlationFindings, setCorrelationFindings] = useState<any[]>([]);
  const [recommendations,     setRecommendations]     = useState<any[]>([]);
  const [alerts,              setAlerts]              = useState<any[]>([]);
  const [restored,            setRestored]            = useState(false);
  const [timeline,            setTimeline]            = useState<any[]>([]);
  const [riskRanking,         setRiskRanking]         = useState<any[]>([]);
  const [mitreMapping,        setMitreMapping]        = useState<any[]>([]);
  const [executiveReport,     setExecutiveReport]     = useState("");
  const [attackStory,         setAttackStory]         = useState<any>(null);
  const [investigationPlan,   setInvestigationPlan]   = useState<any>(null);
  const [trafficIntelligence, setTrafficIntelligence] = useState<any>(null);

  // ── Restore investigation from DB on mount ────────────────────────────────
  useEffect(() => {
    if (!projectId) return;

    async function restoreFromDb() {
      console.log("PCAP RESTORE STARTED");
      try {
        const res = await fetch(`/api/projects/${projectId}/capture-session`);
        if (!res.ok) return;
        const data = await res.json();
        console.log("RESTORE SESSION RESPONSE", data);
        if (!data.session) return;
        const s = data.session;
        if (
          !s.alerts?.length &&
          !s.iocs?.length &&
          !s.timeline?.length &&
          !s.mitre?.length &&
          !s.riskRanking?.length &&
          !s.executiveReport &&
          !s.findings?.length &&
          !s.trafficIntelligence
        ) return;

        console.log("findings", s.findings);
        console.log("trafficIntelligence", s.trafficIntelligence);
        console.log("alerts", s.alerts);

        setAlerts(s.alerts || []);
        setIocs(s.iocs || []);
        setTimeline(s.timeline || []);
        setCorrelationFindings(s.timeline || []);
        setMitreMapping(s.mitre || []);
        setRiskRanking(s.riskRanking || []);
        setExecutiveReport(s.executiveReport || "");
        setAiSummary(s.executiveReport || "");
        setAttackStory(s.attackStory || null);
        setInvestigationPlan(s.investigationPlan || null);
        setFindings(s.findings || []);
        setTrafficIntelligence(s.trafficIntelligence || null);

        console.log("RESULT BEFORE RESTORE", result);
        const restoredResult: AnalysisResult = {
          total_packets: s.total_packets ?? 0,
          protocols: s.protocols ?? {},
          conversation_count: s.conversation_count ?? 0,
          conversations: s.conversations ?? [],
          top_sources: s.top_sources ?? [],
          top_destinations: s.top_destinations ?? [],
          packets: s.packets ?? [],
          packet_count: s.packets?.length ?? 0,
        };
        console.log("RESULT RESTORED", restoredResult);
        setResult(restoredResult);

        setRestored(true);
      } catch (err) {
        console.error("PCAP restore failed:", err);
      }
    }

    restoreFromDb();
  }, [projectId]);

  // ── Save investigation to DB after analysis completes ────────────────────
  async function saveToDB(data: {
    alerts: any[];
    iocs: any[];
    correlationFindings: any[];
    executiveReport?: string;
    trafficIntelligence?: any;
    findings?: any[];
    total_packets?: number;
    protocols?: Record<string, number>;
    conversations?: any[];
    conversation_count?: number;
    top_sources?: any[];
    top_destinations?: any[];
    packets?: any[];
  }) {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/capture-session`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alerts:            data.alerts,
          iocs:              data.iocs,
          timeline:          data.correlationFindings,
          mitre:             data.correlationFindings,
          riskRanking:       [],
          attackStory:       null,
          investigationPlan: null,
          executiveReport:   data.executiveReport ?? "",
          trafficIntelligence: data.trafficIntelligence || null,
          findings:          data.findings || null,
          total_packets:     data.total_packets,
          protocols:         data.protocols,
          conversations:     data.conversations,
          conversation_count: data.conversation_count,
          top_sources:       data.top_sources,
          top_destinations:  data.top_destinations,
          packets:           data.packets,
        }),
      });
    } catch (err) {
      console.error("PCAP save to DB failed:", err);
    }
  }

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  async function analyze() {
    if (!file) {
      setError("Please select a PCAP file first");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      if (!agentUrl) {
        setError("NEXT_PUBLIC_AGENT_URL is not set — PCAP service is unavailable.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${agentUrl}/pcap/analyze`, {
        method: "POST",
        body:   formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(`Analysis failed: ${errData.detail ?? errData.error ?? res.statusText}`);
        setLoading(false);
        return;
      }

      const data: AnalysisResult = await res.json();

      // Fetch packet list in parallel
      const packetRes = await fetch(`${agentUrl}/pcap/packets`, {
        method: "POST",
        body:   formData,
      });
      const packetData = await packetRes.json();

      setResult({
        ...data,
        packets:      packetData.packets,
        packet_count: packetData.packet_count,
      });
      loadDns();
      const summary = await generateAISummary(data);
      const findingsList = await generateFindings(data);
      const newIocs = await generateIOCsWithReturn(data);
      const correlationResults = await generateCorrelation(data);
      const newAlerts = await generateAlertsWithReturn(newIocs, correlationResults);

      // Fetch Traffic Intelligence
      let trafficIntel = null;
      try {
        const intelRes = await fetch(`${agentUrl}/pcap/traffic-intelligence`);
        if (intelRes.ok) {
          const intelData = await intelRes.json();
          if (intelData && !intelData.error) {
            trafficIntel = intelData;
          }
        }
      } catch (intelErr) {
        console.error("Failed to load traffic intelligence for PCAP:", intelErr);
      }

      setRestored(false);
      // Persist to DB so it survives navigation/refresh
      await saveToDB({
        alerts:              newAlerts,
        iocs:                newIocs,
        correlationFindings: correlationResults,
        trafficIntelligence: trafficIntel,
        executiveReport:     summary,
        findings:            findingsList,
        total_packets:       data.total_packets,
        protocols:           data.protocols,
        conversations:       data.conversations ?? [],
        conversation_count:  data.conversation_count,
        top_sources:         data.top_sources ?? [],
        top_destinations:    data.top_destinations ?? [],
        packets:             packetData.packets ?? [],
      });
    } catch (err) {
      console.error("PCAP analysis error:", err);
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredPackets =
    result?.packets?.filter((p) =>
      p.protocol.toLowerCase().includes(search.toLowerCase())
    ) || [];

  function findValue(lines: string[], startsWith: string) {
    const line = lines.find((l) => l.trim().startsWith(startsWith));
    return line ? line.replace(startsWith, "").trim() : "-";
  }

  function parsePacketDetails(raw: string) {
    const lines = raw.split("\n");
    const sections = {
      frame: [] as string[],
      ip:    [] as string[],
      tcp:   [] as string[],
      tls:   [] as string[],
    };
    let current = "";

    for (const line of lines) {
      if (line.includes("Frame "))                          current = "frame";
      else if (line.includes("Internet Protocol Version")) current = "ip";
      else if (line.includes("Transmission Control Protocol")) current = "tcp";
      else if (line.includes("Transport Layer Security"))   current = "tls";

      if (current && current in sections) {
        sections[current as keyof typeof sections].push(line);
      }
    }
    return sections;
  }

  async function loadPacket(number: string) {
    try {
      setLoadingPacket(true);
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/pcap/packet-details`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ packet_number: Number(number) }),
      });
      const data = await res.json();
      setSelectedPacket(number);
      // Find the packet's protocol from the current result list
      const pkt = result?.packets?.find((p) => p.number === number);
      setSelectedProtocol(pkt?.protocol ?? "");
      setPacketDetails(data.details || "");
      // Reset stream when switching packets
      setStreamData("");
      setStreamId("");
    } finally {
      setLoadingPacket(false);
    }
  }

  async function loadStream(packetNumber: string) {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    const res = await fetch(`${agentUrl}/pcap/follow-stream`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ packet_number: Number(packetNumber) }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    setStreamId(data.stream_id);
    setStreamData(data.content);
  }

  async function loadDns() {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/pcap/dns`);
      const data = await res.json();
      if (!data.error) {
        setDnsDomains(data.domains || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function generateAISummary(analysisData: AnalysisResult): Promise<string> {
    try {
      setSummaryLoading(true);
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/pcap/summary`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_packets:      analysisData.total_packets,
          protocols:          analysisData.protocols,
          conversation_count: analysisData.conversation_count,
          top_sources:        analysisData.top_sources,
          top_destinations:   analysisData.top_destinations,
        }),
      });
      const data = await res.json();
      const summary = data.summary || "";
      setAiSummary(summary);
      return summary;
    } catch (err) {
      console.error(err);
      return "";
    } finally {
      setSummaryLoading(false);
    }
  }

  async function generateFindings(analysisData: AnalysisResult): Promise<any[]> {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/pcap/findings`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocols:          analysisData.protocols,
          conversation_count: analysisData.conversation_count,
          top_sources:        analysisData.top_sources,
          top_destinations:   analysisData.top_destinations,
          conversations:      analysisData.conversations ?? [],
          packets:            analysisData.packets        ?? [],
        }),
      });
      const data = await res.json();
      const f = data.findings || [];
      setFindings(f);
      return f;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async function generateIOCs(analysisData: AnalysisResult) {
    await generateIOCsWithReturn(analysisData);
  }

  async function generateIOCsWithReturn(analysisData: AnalysisResult): Promise<any[]> {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/pcap/iocs`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocols:     analysisData.protocols,
          conversations: analysisData.conversations ?? [],
        }),
      });
      const data = await res.json();
      const found = data.findings || [];
      setIocs(found);
      return found;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async function loadIpInfo(ip: string) {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/ip/info?ip=${ip}`);
      const data = await res.json();
      setSelectedIp(data);
      loadReputation(ip);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadReputation(ip: string) {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/ip/reputation?ip=${ip}`);
      const data = await res.json();
      setReputation(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function viewReport() {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    const payload = {
      summary:              aiSummary,
      correlation_findings: correlationFindings,
      iocs,
      ai_findings:          findings,
      intel:                reputation,
      recommendations,
      filename:             file?.name,
      packet_count:         result?.packet_count,
      protocol_count:       Object.keys(result?.protocols || {}).length,
    };
    const res  = await fetch(`${agentUrl}/report/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    const win  = window.open();
    win?.document.write(data.html);
  }

  async function downloadPdf() {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    const payload = {
      summary:              aiSummary,
      correlation_findings: correlationFindings,
      iocs,
      ai_findings:          findings,
      intel:                reputation,
      recommendations,
      filename:             file?.name,
      packet_count:         result?.packet_count,
      protocol_count:       Object.keys(result?.protocols || {}).length,
    };
    const res  = await fetch(`${agentUrl}/report/pdf`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "NetFusion_Report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function generateCorrelation(analysisData: any) {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      console.log("Correlation Request:", {
        open_ports:  [],
        protocols:   analysisData.protocols || {},
        reputation:  { score: reputation?.score || 0 },
      });
      const res = await fetch(`${agentUrl}/correlation/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          open_ports:  [],
          protocols:   analysisData.protocols || {},
          reputation:  { score: reputation?.score || 0 },
        }),
      });
      const data = await res.json();
      console.log("Correlation Findings:", JSON.stringify(data, null, 2));
      console.log(data);
      console.log(data.findings);
      setCorrelationFindings(data.findings || []);
      return data.findings || [];
    } catch (err) {
      console.error("Correlation Error", err);
      return [];
    }
  }

  async function generateAlerts(iocsData: any[], correlationData: any[]) {
    await generateAlertsWithReturn(iocsData, correlationData);
  }

  async function generateAlertsWithReturn(iocsData: any[], correlationData: any[]): Promise<any[]> {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      const res = await fetch(`${agentUrl}/alerts/generate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iocs:                 iocsData,
          correlation_findings: correlationData,
          intel:                reputation || {},
        }),
      });
      const data = await res.json();
      const found = data.alerts || [];
      setAlerts(found);

      const highAlert = found.find((a: any) => a.severity === "high");
      if (highAlert && Notification.permission === "granted") {
        new Notification("🚨 NetFusion Alert", { body: highAlert.title });
      }
      return found;
    } catch (err) {
      console.error("Alert generation failed:", err);
      return [];
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-accent">
            <path d="M2 2h12v12H2z" />
          </svg>
          <h2 className="font-semibold text-foreground">PCAP Analysis</h2>
        </div>
        {result && (
          <div className="flex gap-3">
            <button
              onClick={viewReport}
              className="px-4 py-2 rounded bg-cyan-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              📄 View Report
            </button>
            <button
              onClick={downloadPdf}
              className="px-4 py-2 rounded bg-green-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              ⬇ Download PDF
            </button>
            <button
              onClick={() => new Notification("🚨 NetFusion Alert", { body: "Frontend notification test" })}
              className="px-4 py-2 rounded bg-yellow-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              🔔 Test Alert
            </button>
          </div>
        )}
      </div>

      {/* Restored session banner */}
      {restored && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .22.53l2.25 2.25a.75.75 0 1 0 1.06-1.06L8.75 8.44V4.75Z" />
          </svg>
          Restored Previous Investigation
        </div>
      )}

      {/* File input row */}
      <div className="flex gap-2 mb-3">
        <label className="flex-1 flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-muted hover:border-accent cursor-pointer transition-colors">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75ZM7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
          </svg>
          <span className="text-foreground text-sm">
            {file ? file.name : "Choose PCAP file"}
          </span>
          <input
            type="file"
            accept=".pcap,.pcapng"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError("");
            }}
            className="hidden"
            disabled={loading}
          />
        </label>

        <button
          onClick={analyze}
          disabled={loading || !file}
          className="flex items-center gap-1.5 bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
              </svg>
              Analyze
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Results */}
      {result && (
        <div className="mt-5">
          {/* Summary stats */}
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-xs text-muted">Total Packets</p>
              <p className="text-sm font-semibold text-foreground">{result.total_packets.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Protocols Found</p>
              <p className="text-sm font-semibold text-foreground">{Object.keys(result.protocols).length}</p>
            </div>
          </div>

          {/* Alert Center */}
          {alerts.length > 0 && (
            <div className="rounded-xl border border-border p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3">🚨 Alert Center</h3>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      alert.severity === "high"
                        ? "border-red-500"
                        : alert.severity === "medium"
                        ? "border-orange-500"
                        : "border-blue-500"
                    }`}
                  >
                    <div className="font-semibold text-sm text-foreground">{alert.title}</div>
                    <div className="text-sm opacity-80 text-muted">{alert.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investigation Findings */}
          {correlationFindings.length > 0 && (
            <div className="bg-surface-2 border border-border rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground text-sm">Investigation Findings</h3>
                <span className="text-xs text-muted">
                  {correlationFindings.length} finding{correlationFindings.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {correlationFindings.map((finding, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-orange-500 pl-3"
                  >
                    <div className="font-medium text-sm text-foreground">{finding.title}</div>
                    <div className="text-sm text-muted">{finding.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary card */}
          <div className="mb-5 bg-surface-2 border border-border rounded-xl">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-accent">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm.75-2.25A.75.75 0 0 1 3 5h10a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 5.75Zm0 3A.75.75 0 0 1 3 8h10a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 8.75Zm0 3A.75.75 0 0 1 3 11h6a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 11.75Z" />
              </svg>
              <h3 className="font-semibold text-foreground text-sm">AI Analysis</h3>
            </div>
            <div className="p-4">
              {summaryLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <div className="w-3.5 h-3.5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                  Generating analysis…
                </div>
              ) : (
                <p className="text-sm text-muted whitespace-pre-wrap">{aiSummary}</p>
              )}
            </div>
          </div>

          {/* Protocol table */}
          {Object.keys(result.protocols).length === 0 ? (
            <p className="text-muted text-sm">No protocols detected.</p>
          ) : (
            <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Protocol</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Packet Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.protocols)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([protocol, count]) => (
                      <tr
                        key={protocol}
                        className="border-b border-border last:border-0 hover:bg-surface transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-foreground text-xs">{protocol}</td>
                        <td className="px-4 py-2.5 text-muted text-xs">{String(count)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Packet Explorer */}
          <div className="mt-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter protocol (tcp, tls, udp, quic...)"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
            />
          </div>

          {filteredPackets.length > 0 && (
            <div className="mt-5 bg-surface-2 border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-sm font-medium text-foreground">
                Packet Explorer ({filteredPackets.length})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted">No</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted">Protocol</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted">Source</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted">Destination</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted">Length</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted">Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPackets.slice(0, 100).map((packet) => (
                      <tr
                        key={packet.number}
                        onClick={() => loadPacket(packet.number)}
                        className={`cursor-pointer border-b border-border last:border-0 hover:bg-surface transition-colors ${
                          selectedPacket === packet.number ? "bg-accent/10" : ""
                        }`}
                      >
                        <td className="px-4 py-2 font-mono text-xs text-muted">{packet.number}</td>
                        <td className="px-4 py-2"><ProtocolBadge protocol={packet.protocol} /></td>
                        <td className="px-4 py-2 font-mono text-foreground text-xs">
                          <IPAddress ip={packet.src} onClick={(ip) => { loadIpInfo(ip); }} />
                        </td>
                        <td className="px-4 py-2 font-mono text-foreground text-xs">
                          <IPAddress ip={packet.dst} onClick={(ip) => { loadIpInfo(ip); }} />
                        </td>
                        <td className="px-4 py-2 text-xs text-muted">{packet.length}</td>
                        <td className="px-4 py-2 text-xs text-muted truncate max-w-xs">{packet.info}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Packet detail drawer */}
          {selectedPacket && (
            <div className="mt-5 bg-surface-2 border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    Packet #{selectedPacket}
                  </span>
                  {selectedProtocol && <ProtocolBadge protocol={selectedProtocol} />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadStream(selectedPacket!)}
                    className="bg-accent text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Follow TCP Stream
                  </button>
                  <button
                    onClick={() => { setSelectedPacket(null); setPacketDetails(""); setStreamData(""); setStreamId(""); }}
                    className="text-muted hover:text-foreground transition-colors text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
              {loadingPacket ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted">
                  <div className="w-3.5 h-3.5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              ) : (() => {
                const parsed = parsePacketDetails(packetDetails);

                const frameLength   = findValue(parsed.frame, "Frame Length:");
                const arrivalTime   = findValue(parsed.frame, "Arrival Time:");
                const sourceIp      = findValue(parsed.ip,    "Source Address:");
                const destinationIp = findValue(parsed.ip,    "Destination Address:");
                const srcPort       = findValue(parsed.tcp,   "Source Port:");
                const dstPort       = findValue(parsed.tcp,   "Destination Port:");

                return (
                  <div className="space-y-4 p-4">
                    {/* Summary grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: "Source IP",      value: sourceIp,      clickable: true },
                        { label: "Destination IP", value: destinationIp, clickable: true },
                        { label: "Src Port",        value: srcPort,       clickable: false },
                        { label: "Dst Port",        value: dstPort,       clickable: false },
                        { label: "Frame Length",    value: frameLength,   clickable: false },
                        { label: "Arrival Time",    value: arrivalTime,   clickable: false },
                      ].map(({ label, value, clickable }) => (
                        <div key={label} className="bg-surface border border-border rounded-lg px-3 py-2">
                          <p className="text-xs text-muted mb-0.5">{label}</p>
                          {clickable && value !== "-" ? (
                            <IPAddress ip={value} onClick={loadIpInfo} />
                          ) : (
                            <p className="text-xs font-mono text-foreground break-all">{value}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Per-layer accordions */}
                    {(["frame", "ip", "tcp", "tls"] as const).map((key) => {
                      const labels = { frame: "Frame", ip: "IPv4", tcp: "TCP", tls: "TLS" };
                      const lines  = parsed[key];
                      if (lines.length === 0) return null;
                      return (
                        <details key={key} open>
                          <summary className="cursor-pointer font-semibold text-sm text-foreground select-none py-1">
                            {labels[key]}
                          </summary>
                          <pre className="text-xs mt-2 whitespace-pre-wrap text-muted leading-relaxed pl-2 border-l border-border">
                            {lines.join("\n")}
                          </pre>
                        </details>
                      );
                    })}

                    {/* TCP Stream */}
                    {streamData && (
                      <div className="mt-6">
                        <h3 className="font-semibold text-sm text-foreground mb-2">
                          TCP Stream #{streamId}
                        </h3>
                        <pre className="bg-surface-2 p-4 rounded-lg overflow-auto max-h-[400px] text-xs text-foreground whitespace-pre-wrap border border-border">
                          {streamData}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (() => {
            const severityColors: Record<string, string> = {
              INFO:     "border-green-500",
              MEDIUM:   "border-orange-500",
              WARNING:  "border-yellow-500",
              HIGH:     "border-orange-600",
              CRITICAL: "border-red-500",
            };
            return (
              <div className="mt-5 bg-surface-2 border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">Findings</h3>
                  <span className="text-xs text-muted">{findings.length} issues</span>
                </div>
                <div className="p-4 space-y-2">
                  {findings.map((finding, index) => (
                    <div
                      key={index}
                      className={`bg-surface border border-border rounded-lg p-3 border-l-4 ${
                        severityColors[finding.severity] ?? "border-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm text-foreground">
                          {finding.type ?? (finding as any).title ?? "Finding"}
                        </h4>
                        <span className="text-xs font-medium text-muted shrink-0">{finding.severity}</span>
                      </div>
                      {finding.description && (
                        <p className="text-xs text-muted">{finding.description}</p>
                      )}
                      {finding.asset && (
                        <div className="text-xs font-mono text-accent mt-1">{finding.asset}</div>
                      )}
                      {finding.date && (
                        <div className="text-xs text-muted mt-1 opacity-60">{finding.date}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* IOC Detection */}
          {iocs.length > 0 && (() => {
            const borderColors: Record<string, string> = {
              INFO:     "border-blue-500",
              MEDIUM:   "border-yellow-500",
              HIGH:     "border-orange-500",
              WARNING:  "border-yellow-500",
              CRITICAL: "border-red-500",
            };
            const badgeColors: Record<string, string> = {
              INFO:     "bg-blue-500/20 text-blue-400",
              MEDIUM:   "bg-yellow-500/20 text-yellow-400",
              HIGH:     "bg-orange-500/20 text-orange-400",
              WARNING:  "bg-yellow-500/20 text-yellow-400",
              CRITICAL: "bg-red-500/20 text-red-400",
            };
            return (
              <div className="mt-5 bg-surface-2 border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">IOC Detection</h3>
                  <span className="text-xs text-muted">{iocs.length} indicator{iocs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="p-4 space-y-2">
                  {iocs.map((ioc, index) => {
                    const sev = (ioc.severity ?? "INFO").toUpperCase();
                    return (
                      <div
                        key={index}
                        className={`bg-surface border border-border rounded-lg p-3 border-l-4 ${
                          borderColors[sev] ?? "border-muted"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-medium text-sm text-foreground">{ioc.type}</div>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${
                            badgeColors[sev] ?? "bg-gray-500/20 text-gray-400"
                          }`}>
                            {sev}
                          </span>
                        </div>
                        {ioc.asset && (
                          <div className="text-xs font-mono text-accent mb-1">{ioc.asset}</div>
                        )}
                        {ioc.description && (
                          <p className="text-xs text-muted">{ioc.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* IP Intelligence */}
          {selectedIp && (
            <div className="bg-surface-2 border border-border rounded-xl p-4 mb-5 mt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-foreground">IP Intelligence</h3>
                <button
                  onClick={() => setSelectedIp(null)}
                  className="text-muted hover:text-foreground transition-colors text-xs"
                >
                  Close
                </button>
              </div>
              <div className="space-y-2 text-sm text-foreground">
                <div><strong>IP:</strong> {selectedIp.ip}</div>
                <div><strong>Organization:</strong> {selectedIp.org}</div>
                <div><strong>Country:</strong> {selectedIp.country}</div>
                <div><strong>City:</strong> {selectedIp.city}</div>
                <div><strong>ASN:</strong> {selectedIp.asn}</div>
                <div><strong>ISP:</strong> {selectedIp.isp}</div>
                <div><strong>Classification:</strong>{" "}{selectedIp.classification}</div>
                <div>
                  <strong>Risk Level:</strong>{" "}
                  <span
                    className={
                      selectedIp.risk === "HIGH"
                        ? "text-red-400"
                        : selectedIp.risk === "MEDIUM"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }
                  >
                    {selectedIp.risk}
                  </span>
                </div>

              </div>

              {selectedIp.summary && (
                <div className="mt-4 rounded-lg border border-border bg-surface-3 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted mb-2">
                    Endpoint Summary
                  </div>
                  <p className="text-sm leading-relaxed">
                    {selectedIp.summary}
                  </p>
                </div>
              )}

              {reputation && (
                <div className="mt-4 rounded-lg border border-border p-3">
                  <h4 className="font-medium mb-2">Threat Intelligence</h4>
                  <div>Reputation{" "}{reputation.reputation}</div>
                  <div>Abuse Score{" "}{reputation.score}</div>
                  <div>Reports{" "}{reputation.reports}</div>
                </div>
              )}
            </div>
          )}

          {/* DNS Explorer */}
          {dnsDomains.length > 0 && (
            <div className="mt-5 bg-surface-2 border border-border rounded-xl">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground">DNS Explorer</h3>
                <span className="text-xs text-muted">{dnsDomains.length} domains</span>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {dnsDomains.map((domain) => (
                    <div
                      key={domain}
                      className="px-3 py-2 rounded-lg bg-surface text-sm font-mono text-foreground border border-border"
                    >
                      {domain}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversations table */}
          {result.conversations && result.conversations.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted">Conversations</p>
                  <p className="text-sm font-semibold text-foreground">
                    {result.conversation_count}
                  </p>
                </div>
              </div>

              <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Source</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Destination</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Protocol</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Packets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.conversations.map((conv, index) => (
                      <tr
                        key={index}
                        className="border-b border-border last:border-0 hover:bg-surface transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-foreground text-xs">
                          <IPAddress ip={conv.src} onClick={loadIpInfo} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-foreground text-xs">
                          <IPAddress ip={conv.dst} onClick={loadIpInfo} />
                        </td>
                        <td className="px-4 py-2.5 text-muted text-xs"><ProtocolBadge protocol={conv.protocol} /></td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-accent">{conv.packets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Top Sources & Destinations */}
          {((result.top_sources && result.top_sources.length > 0) ||
            (result.top_destinations && result.top_destinations.length > 0)) && (
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              {/* Top Sources */}
              <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border text-sm font-medium text-foreground">
                  Top Sources
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">IP</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Packets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.top_sources?.map((item) => (
                      <tr key={item.ip} className="border-b border-border last:border-0 hover:bg-surface transition-colors">
                        <td className="px-4 py-2.5 font-mono text-foreground text-xs">
                          <IPAddress ip={item.ip} onClick={loadIpInfo} />
                        </td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-accent">{item.packets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Top Destinations */}
              <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border text-sm font-medium text-foreground">
                  Top Destinations
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">IP</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Packets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.top_destinations?.map((item) => (
                      <tr key={item.ip} className="border-b border-border last:border-0 hover:bg-surface transition-colors">
                        <td className="px-4 py-2.5 font-mono text-foreground text-xs">
                          <IPAddress ip={item.ip} onClick={loadIpInfo} />
                        </td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-accent">{item.packets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IP Info Drawer */}
      {selectedIp && (
        <div className="mt-5 bg-surface-2 border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">
              IP Info — {selectedIp.ip ?? selectedIp.query ?? "Unknown"}
            </h3>
            <button
              onClick={() => setSelectedIp(null)}
              className="text-muted hover:text-foreground transition-colors text-xs"
            >
              Close
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Country",    value: selectedIp.country   ?? selectedIp.country_name },
              { label: "Region",     value: selectedIp.region    ?? selectedIp.region_name },
              { label: "City",       value: selectedIp.city },
              { label: "ISP / Org",  value: selectedIp.isp       ?? selectedIp.org },
              { label: "ASN",        value: selectedIp.as        ?? selectedIp.asn },
              { label: "Timezone",   value: selectedIp.timezone },
              { label: "Latitude",   value: selectedIp.lat       != null ? String(selectedIp.lat) : undefined },
              { label: "Longitude",  value: selectedIp.lon       != null ? String(selectedIp.lon) : undefined },
              { label: "Hosting",    value: selectedIp.hosting   != null ? (selectedIp.hosting ? "Yes" : "No") : undefined },
              { label: "Proxy",      value: selectedIp.proxy     != null ? (selectedIp.proxy    ? "Yes" : "No") : undefined },
              { label: "Mobile",     value: selectedIp.mobile    != null ? (selectedIp.mobile   ? "Yes" : "No") : undefined },
            ]
              .filter(({ value }) => value != null && value !== "")
              .map(({ label, value }) => (
                <div key={label} className="bg-surface border border-border rounded-lg px-3 py-2">
                  <p className="text-xs text-muted mb-0.5">{label}</p>
                  <p className="text-xs font-mono text-foreground break-all">{value}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
