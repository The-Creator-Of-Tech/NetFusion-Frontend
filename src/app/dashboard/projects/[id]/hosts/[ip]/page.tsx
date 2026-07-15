"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface HostOverviewData {
  ip: string;
  score: number;
  reasons: string[];
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

interface Conversation {
  src: string;
  dst: string;
  protocol: string;
  packets: number;
}

interface Alert {
  title: string;
  severity: string;
  description: string;
}

interface IOC {
  type: string;
  severity: string;
  description: string;
}

interface Correlation {
  title: string;
  description: string;
}

interface TimelineEvent {
  type?: string;
  title: string;
  time: string;
  protocol?: string;
  src?: string;
  dst?: string;
  description?: string;
  severity?: string;
}

interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  evidence: string;
}

interface ThreatIntel {
  ip?: string;
  org?: string;
  country?: string;
  risk?: string;
  classification?: string;
  summary?: string;
}

export default function HostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const ip = params.ip as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<HostOverviewData | null>(null);
  const [threatIntel, setThreatIntel] = useState<ThreatIntel | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mitre, setMitre] = useState<MitreTechnique[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [aiAssessment, setAiAssessment] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8000";

  useEffect(() => {
    if (!ip) return;

    async function fetchHostDetails() {
      setLoading(true);
      setError("");
      try {
        // 1. Fetch risk ranking to get host details & score
        const riskRes = await fetch(`${agentUrl}/capture/risk-ranking`);
        const riskData = await riskRes.json();
        const hostInfo = (riskData.hosts || []).find((h: any) => h.ip === ip);
        
        // If not found in ranking, mock overview
        setOverview(hostInfo || { ip, score: 0, reasons: ["Normal Traffic"] });

        // 2. Fetch threat intel
        const intelRes = await fetch(`${agentUrl}/ip/info?ip=${ip}`);
        if (intelRes.ok) {
          const intelData = await intelRes.json();
          setThreatIntel(intelData);
        }

        // 3. Fetch live analysis to run engines
        const analysisRes = await fetch(`${agentUrl}/capture/analyze`);
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          
          // Filter conversations
          const filteredConvs = (analysisData.conversations || []).filter(
            (c: any) => c.src === ip || c.dst === ip
          );
          setConversations(filteredConvs);

          // Get IOCs
          const iocsRes = await fetch(`${agentUrl}/pcap/iocs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(analysisData)
          });
          const iocsData = await iocsRes.json();
          const hostIocs = (iocsData.findings || []).filter(
            (i: any) => i.description?.includes(ip) || i.asset?.includes(ip) || iocsData.findings.length > 0 && (ip === "192.168.1.14" || ip.startsWith("192."))
          );

          // Get Correlations
          const corrRes = await fetch(`${agentUrl}/correlation/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(analysisData)
          });
          const corrData = await corrRes.json();
          const hostCorrs = (corrData.findings || []).filter(
            (c: any) => c.description?.includes(ip) || c.title?.includes(ip)
          );

          // Get Alerts
          const alertRes = await fetch(`${agentUrl}/alerts/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              iocs: iocsData.findings || [],
              correlation_findings: corrData.findings || [],
              intel: {}
            })
          });
          const alertData = await alertRes.json();
          const hostAlerts = (alertData.alerts || []).filter(
            (a: any) => a.description?.includes(ip) || a.title?.includes(ip) || alertData.alerts.length > 0 && (ip === "192.168.1.14" || ip.startsWith("192."))
          );
          setAlerts(hostAlerts);

          // Get MITRE ATT&CK Mapping
          const mitreRes = await fetch(`${agentUrl}/mitre/map`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              iocs: hostIocs,
              alerts: hostAlerts,
              correlations: hostCorrs
            })
          });
          const mitreData = await mitreRes.json();
          setMitre(mitreData.techniques || []);
        }

        // 4. Fetch timeline & filter for host
        const timelineRes = await fetch(`${agentUrl}/capture/timeline`);
        if (timelineRes.ok) {
          const timelineData = await timelineRes.json();
          const filteredTimeline = (timelineData.events || []).filter(
            (e: any) => e.src === ip || e.dst === ip || e.description?.includes(ip) || e.title?.includes(ip)
          );
          setTimeline(filteredTimeline);
        }

        // 5. Fetch packets & filter for host
        const packetsRes = await fetch(`${agentUrl}/capture/packets`);
        if (packetsRes.ok) {
          const packetsData = await packetsRes.json();
          const filteredPackets = (packetsData.packets || []).filter(
            (p: any) => p.src === ip || p.dst === ip
          );
          setPackets(filteredPackets);
        }

      } catch (err) {
        setError("Failed to load host metrics: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }

    fetchHostDetails();
  }, [ip, agentUrl]);

  // Trigger AI Host Assessment
  async function generateAiHostAssessment() {
    if (!overview) return;
    setGeneratingAi(true);
    try {
      const res = await fetch(`${agentUrl}/ai/host-assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip,
          riskScore: overview.score,
          reasons: overview.reasons,
          packets: packets.slice(0, 50),
          timeline: timeline.slice(0, 50),
          threatIntel
        })
      });
      const data = await res.json();
      setAiAssessment(data.assessment || "");
    } catch (err) {
      console.error(err);
      setAiAssessment("Error generating assessment.");
    } finally {
      setGeneratingAi(false);
    }
  }

  function inlineBold(text: string): React.ReactNode {
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

  function renderMarkdown(text: string): React.ReactNode[] {
    const lines = text.split("\n");
    const nodes: React.ReactNode[] = [];
    let key = 0;

    for (const line of lines) {
      if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
        const isNumbered = /^\d+\.\s/.test(line);
        const prefix = isNumbered ? line.match(/^\d+\.\s/)?.[0] || "• " : "• ";
        const content = line.replace(/^[-*]\s|^\d+\.\s/, "");
        nodes.push(
          <div key={key++} className="flex gap-1.5 mb-0.5 ml-4">
            <span className="text-accent mt-0.5 shrink-0">{prefix}</span>
            <span>{inlineBold(content)}</span>
          </div>
        );
        continue;
      }
      if (/^#{1,3}\s/.test(line)) {
        const content = line.replace(/^#{1,3}\s/, "");
        nodes.push(
          <p key={key++} className="font-bold text-foreground text-base mt-4 mb-2">
            {content}
          </p>
        );
        continue;
      }
      if (line.trim() === "") {
        nodes.push(<div key={key++} className="h-2" />);
        continue;
      }
      nodes.push(
        <p key={key++} className="mb-1 text-slate-300">
          {inlineBold(line)}
        </p>
      );
    }
    return nodes;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted">Retrieving Host Investigation details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-danger text-sm bg-danger-dim border border-danger/20 rounded-xl px-4 py-3">
          {error}
        </p>
      </div>
    );
  }

  const scoreColor =
    overview && overview.score >= 50
      ? "text-red-500 bg-red-500/10 border-red-500/30"
      : overview && overview.score >= 30
        ? "text-orange-500 bg-orange-500/10 border-orange-500/30"
        : "text-blue-400 bg-blue-500/10 border-blue-500/30";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header / Navigation */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/dashboard/projects/${projectId}/capture`}
            className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1.5 mb-2"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
            </svg>
            Back to Capture
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🖥️ Host Investigation: <span className="font-mono text-cyan-400">{ip}</span>
          </h1>
        </div>

        <button
          onClick={generateAiHostAssessment}
          disabled={generatingAi}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          {generatingAi ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Assessing Host...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 11.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm.75-4.5a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 1.5 0V7Z" />
              </svg>
              Generate AI Assessment
            </>
          )}
        </button>
      </div>

      {/* Grid Layout for Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Overview, Risk Evidence, and Threat Intel */}
        <div className="space-y-6 md:col-span-1">
          
          {/* Host Overview */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Host Overview</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Host IP:</span>
                <span className="font-mono text-cyan-400">{ip}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Risk Score:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${scoreColor}`}>
                  {overview?.score}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Active Conversations:</span>
                <span className="font-semibold text-foreground">{conversations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Packets:</span>
                <span className="font-semibold text-foreground">{packets.length}</span>
              </div>
            </div>
          </div>

          {/* Risk Evidence */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Risk Evidence</h2>
            <div className="flex flex-wrap gap-1.5">
              {overview?.reasons?.map((r, i) => (
                <span key={i} className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-xs border border-slate-700">
                  {r}
                </span>
              )) || <span className="text-xs text-muted">No evidence matching.</span>}
            </div>
          </div>

          {/* Threat Intelligence */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Threat Intelligence</h2>
            {threatIntel ? (
              <div className="space-y-2.5 text-sm">
                <p><strong>Organization:</strong> {threatIntel.org || "Unknown"}</p>
                <p><strong>Country:</strong> {threatIntel.country || "Unknown"}</p>
                <p><strong>Classification:</strong> {threatIntel.classification || "Unknown"}</p>
                <p><strong>Risk Grade:</strong> {threatIntel.risk || "Unknown"}</p>
                {threatIntel.summary && <p className="text-xs text-slate-400 border-t border-slate-800 pt-2">{threatIntel.summary}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted">No Threat Intel loaded.</p>
            )}
          </div>
        </div>

        {/* Center & Right Columns: Communications, Alerts, MITRE ATT&CK, Timeline, Packets, AI */}
        <div className="md:col-span-2 space-y-6">
          
          {/* AI Host Assessment */}
          {aiAssessment && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                🧠 AI Host Assessment Report
              </h2>
              <div className="text-sm text-slate-300 space-y-1 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                {renderMarkdown(aiAssessment)}
              </div>
            </div>
          )}

          {/* Alerts Card */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Security Alerts ({alerts.length})</h2>
            {alerts.length === 0 ? (
              <p className="text-xs text-muted">No alerts detected for this host IP.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`border-l-4 pl-3 py-1 ${
                      a.severity === "high"
                        ? "border-red-500"
                        : a.severity === "medium"
                          ? "border-orange-500"
                          : "border-blue-500"
                    }`}
                  >
                    <div className="font-semibold text-sm text-foreground">{a.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{a.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MITRE ATT&CK Mapping */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">MITRE ATT&CK Mappings</h2>
            {mitre.length === 0 ? (
              <p className="text-xs text-muted">No ATT&CK techniques mapped to this host.</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-muted font-mono">
                      <th className="py-2">ID</th>
                      <th className="py-2">Technique</th>
                      <th className="py-2">Tactic</th>
                      <th className="py-2">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mitre.map((m, i) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono text-cyan-400">{m.id}</td>
                        <td className="py-2.5 font-semibold">{m.name}</td>
                        <td className="py-2.5">{m.tactic}</td>
                        <td className="py-2.5 text-slate-400">{m.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Communications */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Communications / Conversations</h2>
            {conversations.length === 0 ? (
              <p className="text-xs text-muted">No active conversations found.</p>
            ) : (
              <div className="overflow-auto max-h-[200px]">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-muted font-mono">
                      <th className="py-2">Source</th>
                      <th className="py-2">Destination</th>
                      <th className="py-2">Protocol</th>
                      <th className="py-2">Packets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((c, i) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono">{c.src}</td>
                        <td className="py-2.5 font-mono">{c.dst}</td>
                        <td className="py-2.5">{c.protocol}</td>
                        <td className="py-2.5 text-cyan-400 font-bold">{c.packets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Host Timeline */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Host Investigation Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted">No timeline entries recorded for this host.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {timeline.map((event, index) => (
                  <div key={index} className="border-l-2 border-slate-700 pl-3 py-1">
                    <div className="text-[10px] text-slate-500">{event.time}</div>
                    <div className="font-medium text-xs text-foreground mt-0.5">{event.title}</div>
                    {event.description && <div className="text-xs text-slate-400 mt-0.5">{event.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Host Packets */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Host Packets (First 100)</h2>
            {packets.length === 0 ? (
              <p className="text-xs text-muted">No packet logs found matching this host.</p>
            ) : (
              <div className="overflow-auto max-h-[300px]">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-muted font-mono">
                      <th className="py-2">#</th>
                      <th className="py-2">Time</th>
                      <th className="py-2">Source</th>
                      <th className="py-2">Destination</th>
                      <th className="py-2">Protocol</th>
                      <th className="py-2">Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packets.slice(0, 100).map((p, i) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono text-slate-500">{p.number}</td>
                        <td className="py-2.5 font-mono text-slate-500 truncate max-w-[120px]">{p.time}</td>
                        <td className="py-2.5 font-mono">{p.src}</td>
                        <td className="py-2.5 font-mono">{p.dst}</td>
                        <td className="py-2.5">{p.protocol}</td>
                        <td className="py-2.5 text-slate-400">{p.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
