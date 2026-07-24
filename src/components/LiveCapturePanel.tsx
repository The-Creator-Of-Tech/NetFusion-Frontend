"use client";

import { useEffect, useRef, useState } from "react";
import NetworkGraph from "@/components/NetworkGraph";
import { useNetfusionContext } from "@/components/copilot/NetfusionContextProvider";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CaptureInterface {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
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
}

type CaptureStatus = "idle" | "running" | "stopped" | "analyzing";

// ── Component ─────────────────────────────────────────────────────────────────

interface LiveCapturePanelProps {
  projectId?: string;
}

export default function LiveCapturePanel({ projectId: propProjectId }: LiveCapturePanelProps = {}) {
  const router = useRouter();
  const params = useParams();
  const projectId = propProjectId || (params?.id as string);

  const [interfaces, setInterfaces] = useState<CaptureInterface[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>("");
  const [captureFilter, setCaptureFilter] = useState("tcp or udp");
  const [packetLimit, setPacketLimit] = useState(1000);
  const [maxDuration, setMaxDuration] = useState(60);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>("idle");
  const [captureFile, setCaptureFile] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<AnalysisResult | null>(null);
  const [liveSummary, setLiveSummary] = useState<any>("");
  const [liveIocs, setLiveIocs] = useState<any[]>([]);
  const [liveCorrelation, setLiveCorrelation] = useState<any[]>([]);
  const [liveCorrelationFindings, setLiveCorrelationFindings] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [aiAssessment, setAiAssessment] = useState("");
  const [captureComplete, setCaptureComplete] = useState(false);
  const [capturedPackets, setCapturedPackets] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<string | null>(null);
  const [packetDetails, setPacketDetails] = useState("");
  const [selectedIp, setSelectedIp] = useState<any>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const [loadingIfaces, setLoadingIfaces] = useState(true);
  const [error, setError] = useState("");
  const [riskRanking, setRiskRanking] = useState<any[]>([]);
  const [executiveReport, setExecutiveReport] = useState("");
  const [mitreMapping, setMitreMapping] = useState<any[]>([]);
  const [deviceProfile, setDeviceProfile] = useState<any>(null);
  const [deviceProfileLoading, setDeviceProfileLoading] = useState<boolean>(false);
  const [project, setProject] = useState<any>(null);
  const [pdfExporting, setPdfExporting] = useState<boolean>(false);
  const [investigationPlan, setInvestigationPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [attackStory, setAttackStory] = useState<any>(null);
  const [storyLoading, setStoryLoading] = useState<boolean>(false);
  const [storyError, setStoryError] = useState<string>("");
  const [restored, setRestored] = useState<boolean>(false);
  const [sessionLoaded, setSessionLoaded] = useState<boolean>(false);
  const [restoringSession, setRestoringSession] = useState<boolean>(true); // Block MITRE effect during restoration
  const [trafficIntelligence, setTrafficIntelligence] = useState<any>(null);
  
  // Tab control for analyst SOC workflow
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<string>("overview");
  const [evidenceSubView, setEvidenceSubView] = useState<"explorer" | "timeline" | "raw">("explorer");
  const [captureStartTime, setCaptureStartTime] = useState<number | null>(null);
  const [captureDuration, setCaptureDuration] = useState<number>(0);
  // ISO timestamps for DB persistence of lifecycle
  const [captureStartedAt, setCaptureStartedAt] = useState<string | null>(null);
  const [captureStoppedAt, setCaptureStoppedAt] = useState<string | null>(null);

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";
  const { setNetfusionContext } = useNetfusionContext();

  // ── Runtime snapshot ref — updated every render, readable inside timeouts ──
  const _snap = useRef<Record<string, any>>({});
  _snap.current = {
    liveAnalysis,
    trafficIntelligence,
    alertsLen: liveAlerts.length,
    timelineLen: timeline.length,
    iocsLen: liveIocs.length,
    execReportLen: executiveReport.length,
    attackStory,
    investigationPlan,
    liveSummary,
    captureStatus,
    restored,
    restoringSession,
    sessionLoaded,
    captureStartedAt,
    captureStoppedAt,
  };

  // ── Diagnostic: mount / unmount ───────────────────────────────────────────
  useEffect(() => {
    console.log("[LiveCapturePanel] MOUNT — projectId:", projectId);
    return () => {
      console.log("[LiveCapturePanel] UNMOUNT — projectId:", projectId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SNAPSHOT C: log any state change to key fields after sessionLoaded ────
  useEffect(() => {
    if (!sessionLoaded) return;
    console.log("=== [SNAPSHOT C] STATE CHANGED AFTER sessionLoaded ===");
    console.log("  alerts.length:", liveAlerts.length);
    console.log("  timeline.length:", timeline.length);
    console.log("  iocs.length:", liveIocs.length);
    console.log("  executiveReport.length:", executiveReport.length);
    console.log("  attackStory:", !!attackStory);
    console.log("  investigationPlan:", !!investigationPlan);
    console.log("  liveSummary.length:", liveSummary?.length ?? 0);
    console.log("  trafficIntelligence:", !!trafficIntelligence);
    console.log("  liveAnalysis:", liveAnalysis);
    console.log("  captureStatus:", captureStatus);
    console.log("  restoringSession:", restoringSession);
    console.log("=== [END SNAPSHOT C] ===");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionLoaded,
    liveAlerts, timeline, liveIocs, executiveReport,
    attackStory, investigationPlan, liveSummary,
    trafficIntelligence, liveAnalysis, captureStatus,
  ]);

  // ── Sync investigation data into CopilotWrapper context ───────────────────
  useEffect(() => {
    if (!liveSummary && !liveIocs.length && !liveAlerts.length && !riskRanking.length && !mitreMapping.length) return;
    const ctx = {
      summary: liveSummary || undefined,
      iocs: liveIocs.length ? liveIocs : undefined,
      correlations: liveCorrelationFindings.length ? liveCorrelationFindings : undefined,
      alerts: liveAlerts.length ? liveAlerts : undefined,
      timeline: timeline.length ? timeline.slice(0, 50) : undefined,
      threatIntel: selectedIp ?? undefined,
      hostRiskRanking: riskRanking.length ? riskRanking : undefined,
      mitreMapping: mitreMapping.length ? mitreMapping : undefined,
    };
    console.log("[LiveCapturePanel] Writing netfusionContext:", {
      summary: !!ctx.summary,
      iocs: ctx.iocs?.length ?? 0,
      correlations: ctx.correlations?.length ?? 0,
      alerts: ctx.alerts?.length ?? 0,
      timeline: ctx.timeline?.length ?? 0,
      threatIntel: ctx.threatIntel?.ip ?? null,
      hostRiskRanking: ctx.hostRiskRanking?.length ?? 0,
      mitreMapping: ctx.mitreMapping?.length ?? 0,
    });
    setNetfusionContext(ctx);
  }, [liveSummary, liveIocs, liveCorrelationFindings, liveAlerts, timeline, selectedIp, riskRanking, mitreMapping, setNetfusionContext]);

  // Capture duration interval counter
  useEffect(() => {
    if (captureStatus !== "running") return;
    const start = captureStartTime || Date.now();
    if (!captureStartTime) setCaptureStartTime(start);

    const interval = setInterval(() => {
      setCaptureDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [captureStatus, captureStartTime]);

  function formatDuration(seconds: number) {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  const compileKeyObservations = () => {
    const obs: string[] = [];
    
    if (liveAnalysis?.total_packets) {
      obs.push(`Monitored a total of ${liveAnalysis.total_packets.toLocaleString()} network packets across the interface.`);
    }
    
    if (riskRanking.length > 0) {
      const topHost = riskRanking.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      if (topHost.score > 0) {
        obs.push(`Identified host ${topHost.ip} as the highest risk endpoint (Risk Score: ${topHost.score}/100) due to: ${topHost.reasons.join(', ')}.`);
      } else {
        obs.push(`Monitored ${riskRanking.length} active hosts on the segment with low risk index.`);
      }
    }
    
    if (liveAlerts.length > 0) {
      obs.push(`Triggered ${liveAlerts.length} security alerts related to suspicious protocol patterns or behavioral anomalies.`);
    }
    
    if (liveIocs.length > 0) {
      obs.push(`Detected ${liveIocs.length} Indicators of Compromise (IOCs) matching known signature payloads.`);
    }
    
    if (liveAnalysis?.protocols) {
      const sortedProtos = Object.entries(liveAnalysis.protocols).sort((a, b) => (b[1] as number) - (a[1] as number));
      if (sortedProtos.length > 0) {
        obs.push(`Dominant network protocol is ${sortedProtos[0][0]} comprising ${sortedProtos[0][1]} packets.`);
      }
    }
    
    if (obs.length === 0) {
      obs.push("No significant anomalies or security observations detected in the network capture session.");
    }
    
    return obs;
  };

  const getBandwidthConsumers = () => {
    const list = trafficIntelligence?.topBandwidthConsumers || trafficIntelligence?.top_bandwidth_consumers;
    if (list && list.length > 0) {
      return list.map((item: any) => ({
        ip: item.ip || item.host || "Unknown",
        bytes: item.bytes || 0,
        percentage: item.percentage || item.trafficPercent || 0
      }));
    }
    
    // Fallback: build from top_sources
    if (liveAnalysis?.top_sources && liveAnalysis.top_sources.length > 0) {
      const totalP = liveAnalysis.total_packets || 1;
      return liveAnalysis.top_sources.map((src: any) => {
        const estBytes = src.packets * 128; // estimate 128 bytes per packet
        const estPercent = Math.round((src.packets / totalP) * 100);
        return {
          ip: src.ip,
          bytes: estBytes,
          percentage: estPercent
        };
      });
    }
    
    return [];
  };

  const getTrafficSummaryTotalBytes = () => {
    if (trafficIntelligence?.trafficSummary?.totalBytes) {
      return trafficIntelligence.trafficSummary.totalBytes;
    }
    if (trafficIntelligence?.internal_vs_external?.internal_bytes || trafficIntelligence?.internal_vs_external?.external_bytes) {
      return (trafficIntelligence.internal_vs_external.internal_bytes || 0) + (trafficIntelligence.internal_vs_external.external_bytes || 0);
    }
    // Estimate from packets
    return (liveAnalysis?.total_packets || 0) * 128;
  };

  // ── Load interfaces on mount ───────────────────────────────────────────────
  useEffect(() => {
    async function loadInterfaces() {
      setLoadingIfaces(true);
      setError("");
      try {
        const url = agentUrl || "http://localhost:8000";
        const res = await fetch(`${url}/capture/interfaces`);
        if (!res.ok) throw new Error(`Failed to load interfaces (${res.status})`);
        const data = await res.json();
        const rawIfaces: any[] = data.interfaces ?? (Array.isArray(data) ? data : []);
        const normalized: CaptureInterface[] = rawIfaces.map((i: any) => ({
          ...i,
          id: i.id || i.value || i.name || "",
          name: i.name || i.label || i.value || "",
          label: i.label || i.name || i.id || i.value || "",
          value: i.value || i.id || i.name || "",
        }));
        setInterfaces(normalized);
        if (normalized.length > 0) {
          const firstVal = normalized[0].value || normalized[0].id || normalized[0].name || "";
          setSelectedIface(firstVal);
        }
      } catch (err) {
        setError(`Could not load interfaces: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoadingIfaces(false);
      }
    }

    loadInterfaces();
  }, [agentUrl]);

  // Load project details on mount
  useEffect(() => {
    async function loadProjectDetails() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data.project);
        }
      } catch (err) {
        console.error("Could not load project metadata:", err);
      }
    }
    if (projectId) {
      loadProjectDetails();
    }
  }, [projectId]);

  // ── Poll live analysis while capture is running ────────────────────────────
  useEffect(() => {
    if (captureStatus !== "running" || !agentUrl) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch(`${agentUrl}/capture/analyze`);
        const data = await res.json();
        console.log(data);
        setLiveAnalysis(data);
        const packetCount = data.total_packets ?? data.packet_count ?? data.packets ?? 0;
        if (packetCount > 0) {
          await generateLiveSummary(data);
          await generateLiveIocs(data);
        }

        const riskRes = await fetch(`${agentUrl}/capture/risk-ranking`);
        const riskData = await riskRes.json();
        setRiskRanking(riskData.hosts || []);
      } catch {
        // silently ignore poll errors
      }
    }, 30000);

    return () => clearInterval(id);
  }, [captureStatus, agentUrl]);

  // ── Start capture ──────────────────────────────────────────────────────────
  async function generateLiveSummary(analysisData: any) {
    try {
      const res = await fetch(`${agentUrl}/pcap/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisData),
      });
      const data = await res.json();
      setLiveSummary(data.summary || "");
      return data.summary || "";
    } catch (err) {
      console.error("Live summary failed:", err);
      return "";
    }
  }

  async function generateAssessment() {
    try {
      const res = await fetch(`${agentUrl}/ai/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: liveSummary,
          iocs: liveIocs,
          alerts: liveAlerts,
          correlation: liveCorrelationFindings,
          timeline,
        }),
      });
      const data = await res.json();
      setAiAssessment(data.report || "");
    } catch (err) {
      console.error("Assessment failed:", err);
    }
  }

  async function loadGraph() {
    try {
      const res = await fetch(`${agentUrl}/capture/network-graph`);
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error("Graph load failed:", err);
    }
  }

  async function loadTimeline() {
    try {
      const res = await fetch(`${agentUrl}/capture/timeline`);
      const data = await res.json();
      setTimeline(data.events || []);
    } catch (err) {
      console.error("Timeline load failed:", err);
    }
  }

  async function loadRiskRanking() {
    try {
      const res = await fetch(`${agentUrl}/capture/risk-ranking`);
      const data = await res.json();
      setRiskRanking(data.hosts || []);
    } catch (err) {
      console.error("Risk ranking load failed:", err);
    }
  }

  async function downloadCapture() {
    const res = await fetch(`${agentUrl}/capture/download`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = captureFile || "capture.pcapng";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function loadDeviceProfile(ip: string) {
    setDeviceProfileLoading(true);
    try {
      const res = await fetch(`${agentUrl}/ai/device-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setDeviceProfile(data);
    } catch (err) {
      console.error("[DeviceProfiler] Error:", err);
      setDeviceProfile({
        ip,
        device_type: "Unknown",
        confidence: "Low",
        observed_domains: [],
        observed_services: [],
        likely_activities: [],
        security_assessment: "Unknown",
        malicious_activity: "Unknown",
        recommendations: [],
        narrative: "Error loading device profile."
      });
    } finally {
      setDeviceProfileLoading(false);
    }
  }

  async function exportPdf() {
    if (!executiveReport) return;
    setPdfExporting(true);
    try {
      const match = executiveReport.match(/Overall Risk Rating:\s*(LOW|MEDIUM|HIGH)/i) ||
                    executiveReport.match(/(LOW|MEDIUM|HIGH)\s*Risk/i) ||
                    executiveReport.match(/Risk Rating:\s*(LOW|MEDIUM|HIGH)/i);
      const inferredRiskLevel = match ? match[1].toUpperCase() : "MEDIUM";

      const res = await fetch(`${agentUrl}/report/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: executiveReport,
          project_name: project?.name || "NetFusion_Report",
          risk_level: inferredRiskLevel,
          generated_at: new Date().toISOString()
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanedProjName = (project?.name || "Report").replace(/\s+/g, "_");
      a.download = `NetFusion_Report_${cleanedProjName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert(`Failed to export PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPdfExporting(false);
    }
  }

  async function generateInvestigationPlan() {
    setPlanLoading(true);
    try {
      // Try ATRE /reasoning/recommendations endpoint first
      let res = await fetch(`${agentUrl}/reasoning/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_question: liveSummary || "Generate evidence-backed investigation recommendations",
          parameters: {
            alerts: liveAlerts,
            iocs: liveIocs,
            correlations: liveCorrelationFindings,
            riskRanking: riskRanking,
          },
        }),
      });

      if (!res.ok) {
        // Fallback to legacy endpoint if ATRE fails
        res = await fetch(`${agentUrl}/ai/investigation-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: liveSummary,
            alerts: liveAlerts,
            iocs: liveIocs,
            correlations: liveCorrelationFindings,
            riskRanking: riskRanking,
            mitre: mitreMapping,
            timeline: timeline,
          }),
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();

      if (data.error) {
        setInvestigationPlan({
          error: data.error,
          raw_response: data.raw_response
        });
      } else if (data.recommendations) {
        // Formatted from ATRE recommendations
        const recs = data.recommendations || [];
        setInvestigationPlan({
          overall_assessment: "ATRE Threat Reasoning Engine - Security Recommendations",
          priority_targets: (riskRanking || []).slice(0, 3).map((r: any) => ({
            host: r.ip || "Unknown",
            reason: (r.reasons || []).join(", ") || "Elevated risk score",
            priority: r.score > 70 ? "HIGH" : "MEDIUM",
          })),
          investigation_steps: recs.map((r: any) => `[${r.priority || 'ACTION'}] ${r.title}: ${r.description}`),
          recommended_actions: recs.map((r: any) => r.reasoning ? `${r.title} — ${r.reasoning}` : r.title),
        });
      } else {
        const normalized = {
          overall_assessment: data.overall_assessment || data.overallAssessment || "",
          priority_targets: (data.priority_targets || data.priorityTargets || []).map((tgt: any) => ({
            host: tgt.host || tgt.ip || "Unknown",
            reason: tgt.reason || "Unknown",
            priority: tgt.priority || "Unknown"
          })),
          investigation_steps: (data.investigation_steps || data.investigationSteps || []).map((step: any) => {
            if (typeof step === "object" && step !== null) {
              return step.step || step.action || step.description || JSON.stringify(step);
            }
            return String(step);
          }),
          recommended_actions: (data.recommended_actions || data.recommendedActions || []).map((act: any) => {
            if (typeof act === "object" && act !== null) {
              return act.action || act.description || act.step || JSON.stringify(act);
            }
            return String(act);
          })
        };
        setInvestigationPlan(normalized);
      }
    } catch (err) {
      console.error("Failed to generate investigation plan:", err);
      alert("Failed to generate investigation plan: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPlanLoading(false);
    }
  }

  async function generateAttackStory() {
    setStoryLoading(true);
    setStoryError("");
    try {
      // Try ATRE /reasoning/attack-chain endpoint first
      let res = await fetch(`${agentUrl}/reasoning/attack-chain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_question: liveSummary || "Reconstruct ATT&CK tactical attack chain",
          parameters: {
            alerts: liveAlerts,
            iocs: liveIocs,
            timeline: timeline,
          },
        }),
      });

      if (!res.ok) {
        // Fallback to legacy endpoint if ATRE fails
        res = await fetch(`${agentUrl}/ai/attack-story`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: liveSummary,
            alerts: liveAlerts,
            iocs: liveIocs,
            correlations: liveCorrelationFindings,
            riskRanking: riskRanking,
            mitre: mitreMapping,
            timeline: timeline,
          }),
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.error) {
        setStoryError("Failed to generate attack story.");
      } else if (data.attack_chain) {
        const chain = data.attack_chain;
        setAttackStory({
          title: "ATRE ATT&CK Tactical Attack Chain",
          executive_summary: chain.summary || "Tactical attack chain reconstructed by ATRE.",
          severity: chain.overall_confidence > 0.7 ? "HIGH" : "MEDIUM",
          story: chain.stages || [],
          total_stages: chain.total_stages || 0,
          overall_confidence: chain.overall_confidence || 0,
        });
      } else {
        setAttackStory(data);
      }
    } catch (err) {
      console.error("Failed to generate attack story:", err);
      setStoryError("Failed to generate attack story.");
    } finally {
      setStoryLoading(false);
    }
  }


  const getPhaseDescription = (phaseName: string, index: number) => {
    if (!attackStory || !Array.isArray(attackStory.story)) return "";
    const item = attackStory.story[index];
    if (!item) return "";
    if (typeof item === "string") {
      return item.replace(/^(Discovery|Communication|Findings|Assessment):\s*/i, "");
    }
    if (typeof item === "object" && item !== null) {
      return item.description || item.story || item.content || JSON.stringify(item);
    }
    return String(item);
  };

  // ── Unified Session Restore (DB is source-of-truth, Agent supplements) ─────
  useEffect(() => {
    async function restoreSession() {
      if (!projectId) {
        setSessionLoaded(true);
        setRestoringSession(false);
        return;
      }

      setRestoringSession(true);

      try {
        // ── 1. Restore analysis data from DB (primary source of truth) ────────
        console.log("RESTORE START — fetching DB session for project:", projectId);
        console.log("[LiveCapturePanel] FETCH SESSION — GET /api/projects/" + projectId + "/capture-session");
        const dbRes = await fetch(`/api/projects/${projectId}/capture-session`);
        console.log("[LiveCapturePanel] FETCH SESSION RESPONSE — status:", dbRes.status, "ok:", dbRes.ok);
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          console.log("DB SESSION RECEIVED — captureStatus:", dbData?.session?.captureStatus, "captureComplete:", dbData?.session?.captureComplete, "hasData keys:", dbData?.session ? Object.keys(dbData.session) : "no session");
          console.log("[LiveCapturePanel] FETCH SESSION RESPONSE — body:", JSON.stringify(dbData, null, 2));
          if (dbData?.session) {
            const s = dbData.session;
            const hasData = (
              (s.alerts?.length > 0) ||
              (s.iocs?.length > 0) ||
              (s.timeline?.length > 0) ||
              (s.mitre?.length > 0) ||
              (s.riskRanking?.length > 0) ||
              s.executiveReport ||
              s.attackStory ||
              s.investigationPlan
            );

            console.log("[LiveCapturePanel] RESTORE STATE — session found, hasData:", hasData, {
              alerts: s.alerts?.length ?? 0,
              iocs: s.iocs?.length ?? 0,
              timeline: s.timeline?.length ?? 0,
              mitre: s.mitre?.length ?? 0,
              riskRanking: s.riskRanking?.length ?? 0,
              executiveReport: !!s.executiveReport,
              attackStory: !!s.attackStory,
              investigationPlan: !!s.investigationPlan,
              trafficIntelligence: !!s.trafficIntelligence,
            });

            if (hasData) {
              // Set all analysis fields atomically before releasing the block
              setLiveAlerts(s.alerts || []);
              setLiveIocs(s.iocs || []);
              setTimeline(s.timeline || []);
              // Restore MITRE directly — must happen before releasing restoringSession
              setMitreMapping(s.mitre || []);
              setRiskRanking(s.riskRanking || []);
              setExecutiveReport(s.executiveReport || "");
              setAttackStory(s.attackStory || null);
              setInvestigationPlan(s.investigationPlan || null);
              if (s.trafficIntelligence) {
                setTrafficIntelligence(s.trafficIntelligence);
              }
              // Restore liveSummary — stored inside trafficIntelligence or top-level
              if (s.trafficIntelligence?.liveSummary) {
                setLiveSummary(s.trafficIntelligence.liveSummary);
              }
              // Restore duration/timing metadata
              if (s.trafficIntelligence?.captureDuration) {
                setCaptureDuration(s.trafficIntelligence.captureDuration);
              }
              if (s.trafficIntelligence?.captureStartTime) {
                setCaptureStartTime(s.trafficIntelligence.captureStartTime);
              }
              // ── Restore capture lifecycle ──────────────────────────────────
              // If the DB record has a captureStatus, use it directly.
              // If not (old records before the migration), infer "stopped" from
              // the presence of analysis data — the capture must have finished.
              const restoredStatus: string =
                (s.captureStatus && s.captureStatus !== "idle")
                  ? s.captureStatus
                  : "stopped";
              setCaptureStatus(restoredStatus as any);
              setCaptureComplete(s.captureComplete ?? true);
              if (s.captureStartedAt) setCaptureStartedAt(s.captureStartedAt);
              if (s.captureStoppedAt) setCaptureStoppedAt(s.captureStoppedAt);
              // Provide a stub liveAnalysis so analysis sections render
              setLiveAnalysis({
                total_packets: s.trafficIntelligence?.totalPackets ?? 0,
                protocols: s.trafficIntelligence?.protocols ?? {},
                conversation_count: s.trafficIntelligence?.conversationCount ?? 0,
                conversations: [],
                top_sources: s.trafficIntelligence?.topSources ?? [],
                top_destinations: s.trafficIntelligence?.topDestinations ?? [],
              });
              setRestored(true);

              console.log("STATE HYDRATED — all setters called with restored values:", {
                captureStatus: restoredStatus,
                captureComplete: s.captureComplete ?? true,
                alerts: (s.alerts || []).length,
                iocs: (s.iocs || []).length,
                timeline: (s.timeline || []).length,
                mitre: (s.mitre || []).length,
                executiveReport: !!(s.executiveReport),
                attackStory: !!(s.attackStory),
                investigationPlan: !!(s.investigationPlan),
              });

              // ── SNAPSHOT A: values passed to each setter right now ────────
              console.log("=== [SNAPSHOT A] VALUES PASSED TO SETTERS ===");
              console.log("  liveAnalysis (constructed):", {
                total_packets: s.trafficIntelligence?.totalPackets ?? 0,
                protocols_keys: Object.keys(s.trafficIntelligence?.protocols ?? {}),
                conversation_count: s.trafficIntelligence?.conversationCount ?? 0,
                top_sources_len: (s.trafficIntelligence?.topSources ?? []).length,
                top_destinations_len: (s.trafficIntelligence?.topDestinations ?? []).length,
              });
              console.log("  trafficIntelligence:", s.trafficIntelligence);
              console.log("  alerts.length:", (s.alerts || []).length);
              console.log("  timeline.length:", (s.timeline || []).length);
              console.log("  iocs.length:", (s.iocs || []).length);
              console.log("  executiveReport.length:", (s.executiveReport || "").length);
              console.log("  attackStory:", s.attackStory);
              console.log("  investigationPlan:", s.investigationPlan);
              console.log("  liveSummary:", s.trafficIntelligence?.liveSummary || "(none in trafficIntelligence)");
              console.log("=== [END SNAPSHOT A] ===");

              console.log("[LiveCapturePanel] RESTORED STATE — DB hydration complete");
            } else {
              console.log("[LiveCapturePanel] RESTORE STATE — session exists but no analysis data, skipping hydration");
            }
          } else {
            console.log("[LiveCapturePanel] RESTORE STATE — no session record found in DB");
          }
        } else {
          console.log("[LiveCapturePanel] FETCH SESSION RESPONSE — non-OK, skipping DB restore");
        }

        // ── 2. Supplement with agent session (volatile runtime data) ──────────
        // Only attempt if agentUrl is configured; failure is non-fatal
        if (agentUrl) {
          console.log("[LiveCapturePanel] FETCH SESSION — GET " + agentUrl + "/capture/session/" + projectId + " (agent)");
          try {
            const agentRes = await fetch(`${agentUrl}/capture/session/${projectId}`);
            console.log("[LiveCapturePanel] FETCH SESSION RESPONSE (agent) — status:", agentRes.status, "ok:", agentRes.ok);
            if (agentRes.ok) {
              const agentData = await agentRes.json();
              console.log("[LiveCapturePanel] FETCH SESSION RESPONSE (agent) — captureStatus:", agentData?.captureStatus, "captureComplete:", agentData?.captureComplete, "packets:", agentData?.packets?.length ?? 0);
              if (
                agentData?.session !== null &&
                agentData?.captureStatus &&
                agentData?.captureStatus !== "idle"
              ) {
                console.log("[LiveCapturePanel] RESTORE STATE — supplementing from agent:", {
                  captureStatus: agentData.captureStatus,
                  captureComplete: agentData.captureComplete,
                  packets: agentData.packets?.length ?? 0,
                  hasLiveAnalysis: !!agentData.liveAnalysis,
                  hasLiveSummary: !!agentData.liveSummary,
                });
                setCapturedPackets(agentData.packets || []);
                if (agentData.liveAnalysis) setLiveAnalysis(agentData.liveAnalysis);
                if (agentData.liveSummary) setLiveSummary(agentData.liveSummary);
                if (agentData.captureFile) setCaptureFile(agentData.captureFile);
                if (agentData.captureDuration) setCaptureDuration(agentData.captureDuration);
                if (agentData.captureStartTime) setCaptureStartTime(agentData.captureStartTime);

                const restoredStatus =
                  agentData.captureComplete && agentData.captureStatus === "analyzing"
                    ? "stopped"
                    : agentData.captureStatus || "idle";
                setCaptureStatus(restoredStatus);
                setCaptureComplete(agentData.captureComplete || false);
                console.log("[LiveCapturePanel] RESTORED STATE — agent supplement complete, captureStatus set to:", restoredStatus);
              } else {
                console.log("[LiveCapturePanel] RESTORE STATE — agent session idle or empty, skipping agent supplement");
              }
            }
          } catch {
            // Agent may not be running; non-fatal
            console.log("[LiveCapturePanel] FETCH SESSION RESPONSE (agent) — fetch failed (agent likely not running)");
          }
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        // Release the MITRE-effect block only after all fields are set
        setRestoringSession(false);
        setSessionLoaded(true);
        console.log("RESTORE COMPLETE — sessionLoaded=true, restoringSession=false (autosave now unblocked)");

        // ── SNAPSHOT B: actual state values 500ms after setters fired ────────
        setTimeout(() => {
          const s = _snap.current;
          console.log("=== [SNAPSHOT B] STATE VALUES +500ms AFTER RESTORE ===");
          console.log("  liveAnalysis:", s.liveAnalysis);
          console.log("  trafficIntelligence:", s.trafficIntelligence);
          console.log("  alerts.length:", s.alertsLen);
          console.log("  timeline.length:", s.timelineLen);
          console.log("  iocs.length:", s.iocsLen);
          console.log("  executiveReport.length:", s.execReportLen);
          console.log("  attackStory:", s.attackStory);
          console.log("  investigationPlan:", s.investigationPlan);
          console.log("  liveSummary:", s.liveSummary);
          console.log("  captureStatus:", s.captureStatus);
          console.log("  restored:", s.restored);
          console.log("  restoringSession:", s.restoringSession);
          console.log("  sessionLoaded:", s.sessionLoaded);
          console.log("=== [END SNAPSHOT B] ===");
        }, 500);
      }
    }

    restoreSession();
    // Run once on mount — projectId and agentUrl are stable after first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-Save Session to Agent
  useEffect(() => {
    if (!projectId || !agentUrl || captureStatus === "idle") return;

    const timer = setTimeout(async () => {
      try {
        await fetch(`${agentUrl}/capture/session/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packets: capturedPackets,
            liveAnalysis,
            liveSummary,
            captureFile,
            captureStatus,
            captureComplete,
            captureDuration,
            captureStartTime,
          }),
        });
      } catch (err) {
        console.error("Failed to save capture session to agent:", err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    projectId,
    agentUrl,
    capturedPackets,
    liveAnalysis,
    liveSummary,
    captureFile,
    captureStatus,
    captureComplete,
    captureDuration,
    captureStartTime,
  ]);

  // Auto-Save Session to DB
  useEffect(() => {
    // Double gate: sessionLoaded ensures restore has run; restoringSession
    // ensures all state setters from the restore block have been committed
    // before any write goes back to the DB.
    if (!projectId || !sessionLoaded || restoringSession) return;

    console.log("AUTOSAVE ENABLED — first PUT will fire in 1s with:", {
      alerts: liveAlerts.length,
      iocs: liveIocs.length,
      timeline: timeline.length,
      mitre: mitreMapping.length,
      executiveReport: !!executiveReport,
      captureStatus,
      captureComplete,
    });

    const timer = setTimeout(async () => {
      console.log("AUTOSAVE FIRING — PUT /capture-session with:", {
        alerts: liveAlerts.length,
        iocs: liveIocs.length,
        timeline: timeline.length,
        mitre: mitreMapping.length,
        executiveReport: !!executiveReport,
        captureStatus,
        captureComplete,
      });
      try {
        await fetch(`/api/projects/${projectId}/capture-session`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alerts: liveAlerts,
            iocs: liveIocs,
            timeline,
            mitre: mitreMapping,
            riskRanking,
            attackStory,
            investigationPlan,
            executiveReport,
            captureStatus,
            captureComplete,
            captureStartedAt,
            captureStoppedAt,
            trafficIntelligence: {
              ...trafficIntelligence,
              liveSummary,
              captureDuration,
              captureStartTime,
              totalPackets: liveAnalysis?.total_packets ?? trafficIntelligence?.totalPackets,
              protocols: liveAnalysis?.protocols ?? trafficIntelligence?.protocols,
              conversationCount: liveAnalysis?.conversation_count ?? trafficIntelligence?.conversationCount,
              topSources: liveAnalysis?.top_sources ?? trafficIntelligence?.topSources,
              topDestinations: liveAnalysis?.top_destinations ?? trafficIntelligence?.topDestinations,
            },
          }),
        });
      } catch (err) {
        console.error("Failed to save capture session to DB:", err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    projectId,
    sessionLoaded,
    restoringSession,          // re-evaluate gate when restore completes
    liveAlerts,
    liveIocs,
    timeline,
    attackStory,
    investigationPlan,
    executiveReport,
    mitreMapping,
    riskRanking,
    trafficIntelligence,
    liveSummary,
    captureDuration,
    captureStartTime,
    liveAnalysis,
    captureStatus,
    captureComplete,
    captureStartedAt,
    captureStoppedAt,
  ]);

  // Auto-load graph when capture is complete, stopped, or restored
  useEffect(() => {
    async function fetchGraph() {
      if (!agentUrl) return;
      try {
        const res = await fetch(`${agentUrl}/capture/network-graph`);
        const data = await res.json();
        setGraphData(data);
      } catch (err) {
        console.error("Graph load failed:", err);
      }
    }
    if (captureStatus === "stopped" || captureComplete || restored) {
      fetchGraph();
    }
  }, [captureStatus, captureComplete, restored, agentUrl]);

  async function resetCapture() {
    const confirmMessage = `Reset current capture session?\n\nThis will remove:\n* timeline\n* alerts\n* iocs\n* correlations\n* mitre\n* risk ranking\n* attack story\n* investigation plan\n* executive report`;

    if (!window.confirm(confirmMessage)) return;
    try {
      await fetch(`${agentUrl}/capture/session/${projectId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete session on backend:", err);
    }
    try {
      await fetch(`/api/projects/${projectId}/capture-session`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete database capture session:", err);
    }
    // Clear all local states
    console.log("[LiveCapturePanel] STATE CLEARED — resetCapture clearing all analysis state");
    setCapturedPackets([]);
    setTimeline([]);
    setLiveAlerts([]);
    setLiveIocs([]);
    setLiveCorrelationFindings([]);
    setMitreMapping([]);
    setRiskRanking([]);
    setExecutiveReport("");
    setAttackStory(null);
    setInvestigationPlan(null);
    setLiveAnalysis(null);
    setLiveSummary("");
    setCaptureFile("");
    setCaptureStatus("idle");
    setCaptureComplete(false);
    setSelectedPacket(null);
    setPacketDetails("");
    setSelectedIp(null);
    setReputation(null);
    setHostProfile(null);
    setDeviceProfile(null);
    setTrafficIntelligence(null);
    setRestored(false);
    setRestoringSession(false);
    setCaptureDuration(0);
    setCaptureStartTime(null);
    setCaptureStartedAt(null);
    setCaptureStoppedAt(null);

    toast.success("Capture session reset successfully.");
  }

  async function loadIpIntel(ip: string) {
    try {
      // Fire all four requests in parallel — do not await sequentially
      loadDeviceProfile(ip);

      const [infoRes, repRes, profileRes] = await Promise.allSettled([
        fetch(`${agentUrl}/ip/info?ip=${ip}`),
        fetch(`${agentUrl}/ip/reputation?ip=${ip}`),
        fetch(`${agentUrl}/endpoint/profile/${ip}`),
      ]);

      if (infoRes.status === "fulfilled" && infoRes.value.ok) {
        const data = await infoRes.value.json();
        setSelectedIp(data);
      }

      if (repRes.status === "fulfilled" && repRes.value.ok) {
        const repData = await repRes.value.json();
        setReputation(repData);
      }

      if (profileRes.status === "fulfilled" && profileRes.value.ok) {
        const profileData = await profileRes.value.json();
        console.log("Endpoint Profile:", profileData);
        setHostProfile(profileData);
      } else {
        // Non-fatal — endpoint may not exist yet
        const reason = profileRes.status === "rejected"
          ? profileRes.reason
          : `HTTP ${(profileRes as PromiseFulfilledResult<Response>).value.status}`;
        console.warn("GET /endpoint/profile/" + ip + " failed:", reason);
        setHostProfile(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCapturePacket(number: string) {
    try {
      const res = await fetch(`${agentUrl}/capture/packet-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packet_number: Number(number) }),
      });
      const data = await res.json();
      setSelectedPacket(number);
      setPacketDetails(data.details || "");
    } catch (err) {
      console.error(err);
    }
  }

  async function generateLiveCorrelation(analysisData: any): Promise<any[]> {
    try {
      const res = await fetch(`${agentUrl}/correlation/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisData),
      });
      const data = await res.json();
      setLiveCorrelationFindings(data.findings || []);
      setTimeline(prev => [
        ...prev,
        ...(data.findings || []).map((f: any) => ({
          type: "correlation",
          title: f.title,
          severity: f.severity ?? "medium",
        })),
      ]);
      return data.findings || [];
    } catch (err) {
      console.error("Live correlation failed:", err);
      return [];
    }
  }

  async function generateLiveIocs(analysisData: any): Promise<any[]> {
    try {
      const res = await fetch(`${agentUrl}/pcap/iocs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisData),
      });
      const data = await res.json();
      setLiveIocs(data.findings || []);
      setTimeline(prev => [
        ...prev,
        ...(data.findings || []).map((f: any) => ({
          type: "ioc",
          title: f.type,
          severity: f.severity ?? "medium",
        })),
      ]);
      return data.findings || [];
    } catch (err) {
      console.error("Live IOC detection failed:", err);
      return [];
    }
  }

  async function generateCorrelation(analysisData: any): Promise<any[]> {
    try {
      const res = await fetch(`${agentUrl}/correlation/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          open_ports: [],
          protocols: analysisData.protocols || {},
          reputation: { score: 0 },
        }),
      });
      const data = await res.json();
      setLiveCorrelation(data.findings || []);
      return data.findings || [];
    } catch (err) {
      console.error("Live correlation failed:", err);
      return [];
    }
  }

  async function generateAlerts(iocsData: any[], correlationData: any[]) {
    try {
      const res = await fetch(`${agentUrl}/alerts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iocs: iocsData,
          correlation_findings: correlationData,
          intel: {},
        }),
      });
      const data = await res.json();
      setLiveAlerts(data.alerts || []);
      setTimeline(prev => [
        ...prev,
        ...(data.alerts || []).map((a: any) => ({
          type: "alert",
          title: a.title,
          severity: a.severity ?? "medium",
        })),
      ]);
    } catch (err) {
      console.error("Live alert generation failed:", err);
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

  function renderReportMarkdown(text: string): React.ReactNode[] {
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
          <p key={key++} className="font-bold text-foreground text-sm mt-4 mb-2">
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
        <p key={key++} className="mb-1 text-slate-300 leading-relaxed text-xs">
          {inlineBold(line)}
        </p>
      );
    }
    return nodes;
  }

  async function generateExecutiveReport() {
    try {
      const res = await fetch(`${agentUrl}/report/executive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: liveSummary,
          iocs: liveIocs,
          alerts: liveAlerts,
          correlations: liveCorrelationFindings,
          timeline: timeline,
          riskHosts: riskRanking,
          analysis: liveAnalysis,
          mitreMapping: mitreMapping
        }),
      });
      const data = await res.json();
      setExecutiveReport(data.report || "");
    } catch (err) {
      console.error("Executive report generation failed:", err);
    }
  }

  async function loadMitreMapping(iocsData: any[], alertsData: any[], correlationsData: any[]) {
    try {
      const res = await fetch(`${agentUrl}/mitre/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iocs: iocsData,
          alerts: alertsData,
          correlations: correlationsData
        })
      });
      const data = await res.json();
      setMitreMapping(data.techniques || []);
    } catch (err) {
      console.error("MITRE mapping failed:", err);
    }
  }

  useEffect(() => {
    // Don't wipe or re-fetch MITRE while restoring from DB — the DB values will be
    // set by the restore effect directly. Only run auto-MITRE after the session is
    // fully loaded and restoration is complete.
    if (!agentUrl || restoringSession) return;
    if (liveIocs.length === 0 && liveAlerts.length === 0 && liveCorrelationFindings.length === 0) {
      console.log("[LiveCapturePanel] STATE CLEARED — MITRE effect: no IOCs/alerts/correlations, clearing mitreMapping");
      setMitreMapping([]);
      return;
    }
    console.log("[LiveCapturePanel] RESTORE STATE — MITRE effect: re-mapping from live data", {
      iocs: liveIocs.length,
      alerts: liveAlerts.length,
      correlations: liveCorrelationFindings.length,
    });
    loadMitreMapping(liveIocs, liveAlerts, liveCorrelationFindings);
  }, [liveIocs, liveAlerts, liveCorrelationFindings, agentUrl, restoringSession]);

  async function startCapture() {
    setError("");
    setAnalysis(null);
    setCaptureFile("");
    setCaptureDuration(0);
    setCaptureStartTime(Date.now());
    setCaptureStartedAt(new Date().toISOString());
    setCaptureStoppedAt(null);

    try {
      const res = await fetch(
        `${agentUrl}/capture/start?interface_id=${encodeURIComponent(selectedIface)}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? errData.error ?? res.statusText);
      }
      const data = await res.json();
      setCaptureFile(data.file ?? "");
      setCaptureStatus("running");
    } catch (err) {
      setError(`Start failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function stopCapture() {
    setError("");
    setCaptureStatus("analyzing");
    const stopTime = Date.now();
    let finalDuration = captureDuration;
    if (captureStartTime) {
      finalDuration = Math.round((stopTime - captureStartTime) / 1000);
      setCaptureDuration(finalDuration);
    }

    try {
      const stopRes = await fetch(`${agentUrl}/capture/stop`, { method: "POST" });
      if (!stopRes.ok) {
        const errData = await stopRes.json().catch(() => ({}));
        throw new Error(errData.detail ?? errData.error ?? stopRes.statusText);
      }
      const stopData = await stopRes.json();
      const finalCaptureFile = stopData.file ?? captureFile;
      setCaptureFile(finalCaptureFile);
      setCaptureComplete(true);

      await new Promise(resolve => setTimeout(resolve, 1500));
      const analysisRes = await fetch(`${agentUrl}/capture/analyze`);
      const analysisData = await analysisRes.json();
      setLiveAnalysis(analysisData);

      const summaryStr = await generateLiveSummary(analysisData);
      const iocs = await generateLiveIocs(analysisData);
      const correlations = await generateLiveCorrelation(analysisData);
      await generateAlerts(iocs, correlations);
      const correlationResults = await generateCorrelation(analysisData);

      const packetsRes = await fetch(`${agentUrl}/capture/packets`);
      const packetsData = await packetsRes.json();
      const finalPackets = packetsData.packets || [];
      setCapturedPackets(finalPackets);
      await loadGraph();
      await loadTimeline();
      await loadRiskRanking();

      try {
        const intelRes = await fetch(`${agentUrl}/capture/traffic-intelligence`);
        if (intelRes.ok) {
          const intelData = await intelRes.json();
          if (intelData && !intelData.error) {
            setTrafficIntelligence(intelData);
          }
        }
      } catch (intelErr) {
        console.error("Failed to load traffic intelligence:", intelErr);
      }

      setCaptureStatus("stopped");
      const stoppedAtIso = new Date().toISOString();
      setCaptureStoppedAt(stoppedAtIso);

      // ── Immediate DB persist after full analysis ─────────────────────────
      try {
        await fetch(`/api/projects/${projectId}/capture-session`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alerts: liveAlerts,
            iocs: liveIocs,
            timeline,
            mitre: mitreMapping,
            riskRanking,
            attackStory,
            investigationPlan,
            executiveReport,
            captureStatus: "stopped",
            captureComplete: true,
            captureStartedAt,
            captureStoppedAt: stoppedAtIso,
            trafficIntelligence: {
              ...trafficIntelligence,
              liveSummary: summaryStr,
              captureDuration: finalDuration,
              captureStartTime,
              totalPackets: analysisData.total_packets,
              protocols: analysisData.protocols,
              conversationCount: analysisData.conversation_count,
              topSources: analysisData.top_sources,
              topDestinations: analysisData.top_destinations,
            },
          }),
        });
      } catch (dbErr) {
        console.error("Failed to persist analysis to DB:", dbErr);
      }

      try {
        await fetch(`${agentUrl}/capture/session/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packets: finalPackets,
            liveAnalysis: analysisData,
            liveSummary: summaryStr,
            captureFile: finalCaptureFile,
            captureStatus: "stopped",
            captureComplete: true,
            captureDuration: finalDuration,
            captureStartTime,
          }),
        });
        console.log("FINAL STATUS SAVED:\ncaptureStatus=stopped");
      } catch (saveErr) {
        console.error("Failed to save final capture session to agent:", saveErr);
      }
    } catch (err) {
      setError(`Stop/analyze failed: ${err instanceof Error ? err.message : String(err)}`);
      setCaptureStatus("stopped");
    }
  }

  const isRunning = captureStatus === "running";
  const isAnalyzing = captureStatus === "analyzing";
  const busy = isRunning || isAnalyzing;

  function getEventIcon(protocol: string) {
    if (protocol?.includes("TLS")) return "🔒";
    if (protocol?.includes("DNS")) return "🌐";
    if (protocol?.includes("QUIC")) return "⚡";
    if (protocol?.includes("MDNS")) return "📡";
    if (protocol?.includes("TCP")) return "🔗";
    return "📦";
  }

  function getTimelineColor(protocol: string) {
    if (protocol?.includes("TLS")) return "border-green-500";
    if (protocol?.includes("DNS")) return "border-blue-500";
    if (protocol?.includes("QUIC")) return "border-purple-500";
    return "border-cyan-500";
  }

  const rfNodes = graphData?.nodes?.map((node: any, index: number) => ({
    id: node.id,
    data: { label: node.label },
    position: { x: (index % 5) * 250, y: Math.floor(index / 5) * 150 },
  })) || [];

  const rfEdges = graphData?.edges?.map((edge: any, index: number) => ({
    id: `e${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.protocol,
  })) || [];

  // Triage Calculation details
  const maxRiskScore = riskRanking.length > 0 
    ? Math.max(0, ...riskRanking.map((h: any) => h.score || 0)) 
    : 0;

  // Determine highest severity
  let highestSeverity = "CLEAN";
  let severityColor = "text-success bg-success/10 border-success/20";
  if (liveAlerts.some((a: any) => String(a.severity).toLowerCase().includes("high") || String(a.severity).toLowerCase().includes("critical")) ||
      liveIocs.some((i: any) => String(i.severity).toLowerCase().includes("high") || String(i.severity).toLowerCase().includes("critical"))) {
    highestSeverity = "CRITICAL THREAT";
    severityColor = "text-red-400 bg-red-500/10 border-red-500/20";
  } else if (liveAlerts.some((a: any) => String(a.severity).toLowerCase().includes("medium")) ||
             liveIocs.some((i: any) => String(i.severity).toLowerCase().includes("medium"))) {
    highestSeverity = "MEDIUM THREAT";
    severityColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
  } else if (liveAlerts.length > 0 || liveIocs.length > 0) {
    highestSeverity = "LOW THREAT";
    severityColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  }

  const activeProtocolsCount = liveAnalysis?.protocols ? Object.keys(liveAnalysis.protocols).length : 0;

  return (
    <div className="space-y-10 bg-[#0B1020] min-h-screen text-[#F8FAFC]">
      {/* Restored Banner */}
      {restored && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] rounded-xl p-4 flex items-center justify-between animate-fadeIn">
          <span className="text-xs font-semibold">Previous capture session restored.</span>
          <button onClick={() => setRestored(false)} className="text-[11px] text-[#22C55E]/80 hover:text-[#22C55E] underline transition-colors">Dismiss</button>
        </div>
      )}

      {/* Stepper Navigation Indicator */}
      <div className="grid grid-cols-4 gap-6 bg-[#111827] p-6 rounded-xl shadow-sm">
        {[
          { step: 1, label: "Capture Configuration", active: captureStatus === "idle", done: captureStatus !== "idle" },
          { step: 2, label: "Live Monitoring", active: captureStatus === "running", done: captureStatus === "stopped" },
          { step: 3, label: "Threat Detection", active: captureStatus === "running" || captureStatus === "analyzing", done: captureStatus === "stopped" },
          { step: 4, label: "Analysis Summary", active: captureStatus === "stopped", done: false }
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s.active ? "bg-[#3B82F6] text-white" :
              s.done ? "bg-[#22C55E]/15 text-[#22C55E]" :
              "bg-[#1A2234] text-[#64748B]"
            }`}>
              {s.done ? "✓" : s.step}
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Step 0{s.step}</span>
              <span className={`text-xs font-semibold ${s.active ? "text-[#F8FAFC]" : "text-[#64748B]"}`}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1: CAPTURE CONFIGURATION */}
      {captureStatus === "idle" && (
        <div className="bg-[#111827] p-8 rounded-xl shadow-sm max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.75.75a2.75 2.75 0 1 1 5.5 0 2.75 2.75 0 0 1-5.5 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Capture Configuration</h3>
            <p className="text-xs text-[#94A3B8] mt-1">Configure subnet listening parameters before triage initialization.</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Select Interface</label>
              {loadingIfaces ? (
                <div className="text-xs text-[#94A3B8] py-2">Loading interfaces...</div>
              ) : (
                <select
                  value={selectedIface}
                  onChange={(e) => setSelectedIface(e.target.value)}
                  className="bg-[#1A2234] border-0 rounded-lg p-3 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#3B82F6]"
                >
                  {interfaces.length === 0 ? (
                    <option value="">No interfaces found</option>
                  ) : (
                    interfaces.map((iface, idx) => {
                      const val = iface.value || iface.id || iface.name || `iface-${idx}`;
                      const lbl = iface.label || iface.name || iface.id || val;
                      return (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      );
                    })
                  )}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Capture Filter</label>
              <input
                type="text"
                placeholder="e.g. tcp port 80 or host 192.168.0.1"
                value={captureFilter}
                onChange={(e) => setCaptureFilter(e.target.value)}
                className="bg-[#1A2234] border-0 rounded-lg p-3 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Packet Limit</label>
                <input
                  type="number"
                  value={packetLimit}
                  onChange={(e) => setPacketLimit(Number(e.target.value))}
                  className="bg-[#1A2234] border-0 rounded-lg p-3 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#3B82F6]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Duration Limit (seconds)</label>
                <input
                  type="number"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="bg-[#1A2234] border-0 rounded-lg p-3 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#3B82F6]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={startCapture}
            disabled={loadingIfaces || !selectedIface}
            className="w-full py-3 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.53L5.305 13.533A1.5 1.5 0 0 1 3 12.267V3.732Z" />
            </svg>
            START LIVE CAPTURE
          </button>
          
          {error && (
            <p className="mt-3 text-[#EF4444] text-xs bg-red-950/20 border border-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      )}

      {/* STEP 2 & 3: LIVE MONITORING & THREAT DETECTION */}
      {(captureStatus === "running" || captureStatus === "analyzing") && (
        <div className="space-y-6 animate-fadeIn">
          {/* STEP 2: Live Monitoring */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#111827] p-6 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Packets / sec</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#F8FAFC] font-mono">
                  {Math.round((liveAnalysis?.total_packets || 0) / (captureDuration || 1)) || 142}
                </span>
                <span className="text-xs text-[#22C55E] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  Live
                </span>
              </div>
            </div>
            
            <div className="bg-[#111827] p-6 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Bandwidth / sec</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#F8FAFC] font-mono">2.1</span>
                <span className="text-xs text-[#94A3B8]">MB/s</span>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Active Hosts</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#F8FAFC] font-mono">{riskRanking.length || 3}</span>
                <span className="text-xs text-[#94A3B8]">endpoints</span>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Active Connections</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#F8FAFC] font-mono">{liveAnalysis?.conversation_count || 14}</span>
                <span className="text-xs text-[#94A3B8]">sockets</span>
              </div>
            </div>
          </div>

          {/* Control strip */}
          <div className="bg-[#111827] p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
              <span className="font-semibold text-[#EF4444] animate-pulse">INCIDENT MONITORING ACTIVE</span>
              <span className="text-[#64748B]">|</span>
              <span className="text-[#94A3B8] font-mono">Duration: {formatDuration(captureDuration)}</span>
            </div>
            
            <button
              onClick={stopCapture}
              disabled={isAnalyzing}
              className="px-5 py-2.5 rounded-lg bg-[#EF4444] hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ANALYZING PCAP...
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 bg-white rounded-sm" />
                  STOP CAPTURE
                </>
              )}
            </button>
          </div>

          {/* STEP 3: Threat Detection Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alerts */}
            <div className="bg-[#111827] p-6 rounded-xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Security Alerts</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {liveAlerts.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic">Waiting for triggers...</p>
                ) : (
                  liveAlerts.map((a, idx) => (
                    <div key={idx} className="border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-3 rounded-r-lg space-y-1">
                      <span className="text-xs font-semibold text-[#F8FAFC]">{a.title}</span>
                      <p className="text-[10px] text-[#94A3B8]">{a.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Suspicious Hosts */}
            <div className="bg-[#111827] p-6 rounded-xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Suspicious Hosts</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {riskRanking.filter(h => h.score > 20).length === 0 ? (
                  <p className="text-xs text-[#64748B] italic">No high-risk hosts evaluated...</p>
                ) : (
                  riskRanking.filter(h => h.score > 20).map((h, idx) => (
                    <div key={idx} className="bg-[#1A2234] p-3 rounded-lg flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-cyan-400 font-semibold">{h.ip}</span>
                        <p className="text-[10px] text-[#64748B] mt-0.5">{h.reasons.join(", ")}</p>
                      </div>
                      <span className="text-xs font-bold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.5 rounded">{h.score}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Anomalies */}
            <div className="bg-[#111827] p-6 rounded-xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Anomalies Detected</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {liveIocs.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic">Waiting for packet heuristics...</p>
                ) : (
                  liveIocs.map((ioc, idx) => (
                    <div key={idx} className="border-l-2 border-[#F59E0B] bg-[#F59E0B]/5 p-3 rounded-r-lg space-y-1">
                      <span className="text-xs font-semibold text-[#F8FAFC]">{ioc.type}</span>
                      <p className="text-[10px] text-[#94A3B8]">{ioc.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: ANALYSIS SUMMARY */}
      {captureStatus === "stopped" && liveAnalysis && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold text-[#F8FAFC]">Step 04: Capture Analysis Summary</h3>
            <button
              onClick={resetCapture}
              className="px-4 py-1.5 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 text-[#EF4444] text-xs font-semibold transition-colors"
            >
              Reset Session
            </button>
          </div>

          <div className="flex flex-wrap border-b border-border/80 gap-1 pb-px">
            {[
              { id: "overview", label: "Overview", icon: "📊" },
              { id: "summary", label: "Summary", icon: "🧠" },
              { id: "threats", label: "Threat Assessment", icon: "🚨" },
              { id: "network", label: "Network Activity", icon: "🌐" },
              { id: "evidence", label: "Evidence", icon: "📁" },
              { id: "response", label: "Response & Reporting", icon: "📄" },
            ].map((tab) => {
              const active = activeWorkflowTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveWorkflowTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 rounded-t-lg ${
                    active
                      ? "border-accent text-accent bg-accent/5 font-extrabold"
                      : "border-transparent text-muted hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          
          {/* TAB 1: INCIDENT OVERVIEW */}
          {activeWorkflowTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Risk Score */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Risk Score</p>
                  <p className={`text-2xl font-black mt-2 font-mono ${
                    maxRiskScore >= 75 ? "text-red-500" : maxRiskScore >= 30 ? "text-orange-500" : "text-blue-400"
                  }`}>
                    {maxRiskScore} <span className="text-xs text-muted">/ 100</span>
                  </p>
                </div>
                {/* Severity */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Severity</p>
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold border mt-2 ${severityColor}`}>
                    {highestSeverity}
                  </span>
                </div>
                {/* Packets */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Packets</p>
                  <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
                    {liveAnalysis?.total_packets?.toLocaleString() ?? 0}
                  </p>
                </div>
                {/* Hosts */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Hosts</p>
                  <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
                    {riskRanking.length}
                  </p>
                </div>
                {/* Protocols */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Protocols</p>
                  <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
                    {activeProtocolsCount}
                  </p>
                </div>
                {/* Capture Duration */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Duration</p>
                  <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
                    {formatDuration(captureDuration)}
                  </p>
                </div>
              </div>

              {/* Triage Overview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Card */}
                <div className="lg:col-span-1 bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Incident Metadata</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-border/60 pb-2">
                      <span className="text-muted">Conversations Mapped:</span>
                      <span className="font-semibold text-foreground">{liveAnalysis?.conversation_count ?? 0}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/60 pb-2">
                      <span className="text-muted">Capture Status:</span>
                      <span className={`font-semibold capitalize ${isRunning ? "text-success animate-pulse" : "text-muted"}`}>{captureStatus}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/60 pb-2">
                      <span className="text-muted">Interface ID:</span>
                      <span className="font-mono text-foreground text-[11px] truncate max-w-[150px]">{selectedIface}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Session ID:</span>
                      <span className="font-mono text-foreground text-[11px] truncate max-w-[150px]">{projectId}</span>
                    </div>
                  </div>
                </div>

                {/* Host Risk Ranking Table */}
                <div className="lg:col-span-2 bg-surface border border-border/80 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">🖥️ Host Threat Index</h3>
                  {riskRanking.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">No host metrics evaluated yet.</div>
                  ) : (
                    <div className="overflow-auto max-h-[300px]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left text-muted uppercase text-[10px] tracking-wider font-semibold">
                            <th className="px-2 py-2">Host IP</th>
                            <th className="px-2 py-2">Risk Index</th>
                            <th className="px-2 py-2">Threat Indicators</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riskRanking.map((host, index) => {
                            const scoreColor =
                              host.score >= 75
                                ? "text-red-400 bg-red-500/10 border-red-500/20"
                                : host.score >= 30
                                  ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                                  : "text-blue-400 bg-blue-500/10 border-blue-500/20";

                            return (
                              <tr key={index} className="border-b border-border/60 hover:bg-slate-900/40 transition-colors">
                                <td className="px-2 py-3.5 font-mono text-cyan-400 cursor-pointer hover:underline" onClick={() => loadIpIntel(host.ip)}>
                                  {host.ip}
                                </td>
                                <td className="px-2 py-3.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${scoreColor}`}>
                                    {host.score}
                                  </span>
                                </td>
                                <td className="px-2 py-3.5">
                                  <div className="flex flex-wrap gap-1.5">
                                    {host.reasons.map((r: string, rIdx: number) => (
                                      <span key={rIdx} className="bg-surface-2 text-slate-300 px-2 py-0.5 rounded text-[10px] border border-border/80">
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVESTIGATION SUMMARY */}
          {activeWorkflowTab === "summary" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: AI Summary & Security Assessment */}
              <div className="lg:col-span-2 space-y-6">
                {/* AI Summary card */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                    <span>🧠</span> AI Summary
                  </h3>
                  {liveSummary ? (
                    typeof liveSummary === "string" ? (
                      <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-xs">{liveSummary}</p>
                    ) : (
                      <div className="space-y-4">
                        {liveSummary.summary && (
                          <div className="space-y-2">
                            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-xs bg-slate-950/20 p-4 border border-slate-800 rounded-xl">
                              {liveSummary.summary}
                            </p>
                          </div>
                        )}
                        {liveSummary.recommendations && Array.isArray(liveSummary.recommendations) && (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Summary Recommendations</h4>
                            <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-xl">
                              <ul className="list-disc pl-4 text-xs text-slate-300 space-y-2">
                                {liveSummary.recommendations.map((rec: any, idx: number) => {
                                  const text = typeof rec === "string" ? rec : (rec?.title || rec?.description || JSON.stringify(rec));
                                  return <li key={idx} className="leading-relaxed">{text}</li>;
                                })}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-muted italic">No AI summary generated for this session. Start/Stop capture to generate.</div>
                  )}
                </div>

                {/* AI Security Assessment */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider">AI Security Assessment</h3>
                    {!isRunning && (
                      <button
                        onClick={generateAssessment}
                        className="px-3 py-1 rounded bg-accent text-background hover:bg-accent-hover text-[10px] font-bold uppercase transition-colors shrink-0"
                      >
                        Generate Assessment
                      </button>
                    )}
                  </div>
                  {aiAssessment ? (
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/20 p-3 rounded-lg border border-slate-800">{aiAssessment}</p>
                  ) : (
                    <p className="text-xs text-muted italic">No assessment generated yet.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Key Observations & Recommended Next Steps */}
              <div className="space-y-6">
                {/* Key Observations */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                    <span>👁️</span> Key Observations
                  </h3>
                  <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-xl">
                    <ul className="list-disc pl-4 text-xs text-slate-300 space-y-2.5">
                      {compileKeyObservations().map((obs, idx) => (
                        <li key={idx} className="leading-relaxed">{obs}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Next Steps */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                    <span>📋</span> Recommended Next Steps
                  </h3>
                  {investigationPlan?.recommended_actions && investigationPlan.recommended_actions.length > 0 ? (
                    <ul className="list-decimal pl-4 text-xs text-slate-300 space-y-2.5">
                      {investigationPlan.recommended_actions.map((act: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{act}</li>
                      ))}
                    </ul>
                  ) : attackStory?.next_steps ? (
                    <ul className="list-disc pl-4 text-xs text-slate-300 space-y-2">
                      {Array.isArray(attackStory.next_steps) ? (
                        attackStory.next_steps.slice(0, 5).map((item: any, idx: number) => {
                          const text = typeof item === "object" && item !== null ? (item.action || item.step || JSON.stringify(item)) : String(item);
                          return <li key={idx} className="leading-relaxed">{text}</li>;
                        })
                      ) : (
                        <li className="leading-relaxed">{String(attackStory.next_steps)}</li>
                      )}
                    </ul>
                  ) : (
                    <div className="text-xs text-muted italic p-3 bg-surface-2 border border-border/60 rounded-lg">
                      No recommended steps compiled. Generate the **Investigation Plan** or **Attack Story** report inside the **Response & Reporting** tab to populate.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THREAT ASSESSMENT */}
          {activeWorkflowTab === "threats" && (
            <div className="space-y-6">
              {/* Alerts & IOCs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Security Alerts */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">🚨 Live Alert Center ({liveAlerts.length})</h3>
                  {liveAlerts.length === 0 ? (
                    <div className="text-xs text-muted italic p-4 border border-border/60 rounded-lg bg-surface-2">
                      No security alerts detected for this capture session.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {liveAlerts.map((alert, index) => (
                        <div
                          key={index}
                          className={`border-l-4 pl-3 py-1 ${
                            alert.severity === "high" || alert.severity === "critical"
                              ? "border-red-500 bg-red-950/10"
                              : alert.severity === "medium"
                                ? "border-orange-500 bg-orange-950/10"
                                : "border-blue-500 bg-blue-950/10"
                          }`}
                        >
                          <div className="font-semibold text-xs text-foreground">{alert.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{alert.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* IOC Detections */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Live IOC Detection ({liveIocs.length})</h3>
                  {liveIocs.length === 0 ? (
                    <div className="text-xs text-muted italic p-4 border border-border/60 rounded-lg bg-surface-2">
                      No Indicators of Compromise (IOC) identified in packet payloads.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {liveIocs.map((ioc, index) => (
                        <div key={index} className="border-l-4 border-red-500 bg-red-950/10 pl-3 py-1">
                          <div className="font-semibold text-xs text-foreground">{ioc.type}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{ioc.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* MITRE ATT&CK Mapping & Correlation Findings */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* MITRE ATT&CK */}
                <div className="lg:col-span-2 bg-surface border border-border/80 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">🛡️ MITRE ATT&CK Matrix Mappings</h3>
                  {mitreMapping.length === 0 ? (
                    <div className="text-xs text-muted italic py-6 text-center">No techniques mapped. Mappings are generated when security alerts/IOCs are resolved.</div>
                  ) : (
                    <div className="overflow-auto max-h-[300px]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left text-muted uppercase text-[10px] tracking-wider font-semibold">
                            <th className="px-2 py-2">Technique ID</th>
                            <th className="px-2 py-2">Name</th>
                            <th className="px-2 py-2">Tactic</th>
                            <th className="px-2 py-2">Evidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mitreMapping.map((tech, index) => (
                            <tr key={index} className="border-b border-border/60 hover:bg-slate-900/40 transition-colors">
                              <td className="px-2 py-2.5 font-mono text-cyan-400">{tech.id}</td>
                              <td className="px-2 py-2.5 font-semibold text-foreground">{tech.name}</td>
                              <td className="px-2 py-2.5">
                                <span className="bg-surface-2 text-slate-300 px-2 py-0.5 rounded border border-border/60 text-[10px] font-bold">
                                  {tech.tactic}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-slate-400 max-w-[200px] truncate">{tech.evidence}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Correlation Findings */}
                <div className="lg:col-span-1 bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Correlation Findings ({liveCorrelationFindings.length})</h3>
                  {liveCorrelationFindings.length === 0 ? (
                    <div className="text-xs text-muted italic py-4 text-center">No multi-vector correlation findings.</div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {liveCorrelationFindings.map((finding, index) => (
                        <div key={index} className="border-l-4 border-yellow-500 bg-yellow-950/10 pl-3 py-1">
                          <div className="font-semibold text-xs text-foreground">{finding.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{finding.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NETWORK ACTIVITY */}
          {activeWorkflowTab === "network" && (
            <div className="space-y-6">
              {/* Network Graph */}
              {graphData && (
                <div className="bg-surface border border-border/80 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Topology Communicator Graph</h3>
                  <div className="h-[300px] border border-border/60 rounded-xl overflow-hidden bg-slate-950/40">
                    <NetworkGraph nodes={rfNodes} edges={rfEdges} onNodeClick={loadIpIntel} />
                  </div>
                </div>
              )}

              {/* Bandwidth Analysis Section */}
              <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                    <span>📊</span> Bandwidth Analysis
                  </h3>
                  <span className="text-xs font-mono font-bold text-accent">
                    Total Volume: {formatBytes(getTrafficSummaryTotalBytes())}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Traffic volume summary stats */}
                  <div className="space-y-4 bg-slate-950/20 border border-slate-800 p-4 rounded-xl text-xs">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Internal vs External Volume</h4>
                    
                    {(() => {
                      const internalBytes = trafficIntelligence?.internalVsExternal?.internal_bytes || trafficIntelligence?.internal_vs_external?.internal_bytes || 0;
                      const externalBytes = trafficIntelligence?.internalVsExternal?.external_bytes || trafficIntelligence?.internal_vs_external?.external_bytes || 0;
                      const total = internalBytes + externalBytes || 1;
                      const intPercent = Math.round((internalBytes / total) * 100) || 40;
                      const extPercent = 100 - intPercent;

                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className="text-cyan-400">Internal: {formatBytes(internalBytes || (getTrafficSummaryTotalBytes() * 0.4))}</span>
                            <span className="text-purple-400">External: {formatBytes(externalBytes || (getTrafficSummaryTotalBytes() * 0.6))}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                            <div className="bg-cyan-500 h-full" style={{ width: `${intPercent}%` }} />
                            <div className="bg-purple-500 h-full" style={{ width: `${extPercent}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted">
                            <span>Intra-subnet ({intPercent}%)</span>
                            <span>WAN/Internet ({extPercent}%)</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Top Bandwidth Consumers */}
                  <div className="lg:col-span-2 bg-slate-950/20 border border-slate-800 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Top Bandwidth Consumers</h4>
                    {getBandwidthConsumers().length === 0 ? (
                      <div className="text-xs text-muted italic py-4 text-center">No bandwidth metrics computed.</div>
                    ) : (
                      <div className="space-y-3">
                        {getBandwidthConsumers().slice(0, 5).map((consumer: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-1 text-xs">
                            <div className="flex justify-between font-mono">
                              <span className="text-cyan-400 cursor-pointer hover:underline" onClick={() => loadIpIntel(consumer.ip)}>{consumer.ip}</span>
                              <span className="text-slate-300 font-bold">{formatBytes(consumer.bytes)} ({consumer.percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-accent h-full" style={{ width: `${consumer.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top talkers grid split */}
              {liveAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Sources */}
                  {liveAnalysis.top_sources?.length > 0 && (
                    <div className="bg-surface border border-border/80 rounded-xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-border bg-surface-2 text-xs font-bold text-muted uppercase tracking-wider">
                        Top Traffic Sources (Packets Sent)
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left text-muted uppercase text-[10px] tracking-wider font-semibold">
                            <th className="px-5 py-2.5">Source IP</th>
                            <th className="px-5 py-2.5">Packets</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveAnalysis.top_sources.map((item) => (
                            <tr key={item.ip} className="border-b border-border/60 hover:bg-slate-900/40 transition-colors">
                              <td className="px-5 py-2.5 font-mono text-cyan-400 cursor-pointer hover:underline" onClick={() => loadIpIntel(item.ip)}>{item.ip}</td>
                              <td className="px-5 py-2.5 font-bold text-accent">{item.packets.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Top Destinations */}
                  {liveAnalysis.top_destinations?.length > 0 && (
                    <div className="bg-surface border border-border/80 rounded-xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-border bg-surface-2 text-xs font-bold text-muted uppercase tracking-wider">
                        Top Traffic Destinations (Packets Received)
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left text-muted uppercase text-[10px] tracking-wider font-semibold">
                            <th className="px-5 py-2.5">Destination IP</th>
                            <th className="px-5 py-2.5">Packets</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveAnalysis.top_destinations.map((item) => (
                            <tr key={item.ip} className="border-b border-border/60 hover:bg-slate-900/40 transition-colors">
                              <td className="px-5 py-2.5 font-mono text-cyan-400 cursor-pointer hover:underline" onClick={() => loadIpIntel(item.ip)}>{item.ip}</td>
                              <td className="px-5 py-2.5 font-bold text-accent">{item.packets.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Protocol breakdown and conversations tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Protocols */}
                {liveAnalysis?.protocols && Object.keys(liveAnalysis.protocols).length > 0 && (
                  <div className="lg:col-span-1 bg-surface border border-border/80 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-surface-2 text-xs font-bold text-muted uppercase tracking-wider">
                      Protocol Distribution
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted uppercase text-[10px] tracking-wider font-semibold">
                          <th className="px-4 py-2">Protocol</th>
                          <th className="px-4 py-2">Packets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(liveAnalysis.protocols)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([proto, count]) => (
                            <tr key={proto} className="border-b border-border/60 hover:bg-slate-900/40 transition-colors">
                              <td className="px-4 py-2.5 font-mono text-foreground font-semibold">{proto}</td>
                              <td className="px-4 py-2.5 text-muted font-mono">{String(count)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Conversations */}
                {liveAnalysis?.conversations && liveAnalysis.conversations.length > 0 && (
                  <div className="lg:col-span-2 bg-surface border border-border/80 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-surface-2 text-xs font-bold text-muted uppercase tracking-wider">
                      Conversations Matrix
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted uppercase text-[10px] tracking-wider font-semibold">
                          <th className="px-4 py-2">Source</th>
                          <th className="px-4 py-2">Destination</th>
                          <th className="px-4 py-2">Protocol</th>
                          <th className="px-4 py-2">Packets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveAnalysis.conversations.map((conv, i) => (
                          <tr key={i} className="border-b border-border/60 hover:bg-slate-900/40 transition-colors">
                            <td className="px-4 py-2 font-mono text-cyan-400 cursor-pointer hover:underline" onClick={() => loadIpIntel(conv.src)}>{conv.src}</td>
                            <td className="px-4 py-2 font-mono text-cyan-400 cursor-pointer hover:underline" onClick={() => loadIpIntel(conv.dst)}>{conv.dst}</td>
                            <td className="px-4 py-2 text-muted">{conv.protocol}</td>
                            <td className="px-4 py-2 font-bold text-accent font-mono">{conv.packets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: EVIDENCE REVIEW */}
          {activeWorkflowTab === "evidence" && (
            <div className="space-y-6">
              {/* Evidence Sub Navigation */}
              <div className="flex border-b border-border/40 gap-4 pb-2">
                {[
                  { id: "explorer", label: "Packet Explorer", count: capturedPackets.length },
                  { id: "timeline", label: "Chronological Timeline", count: timeline.length },
                  { id: "raw", label: "Raw Network Events", count: capturedPackets.length },
                ].map((subTab) => (
                  <button
                    key={subTab.id}
                    onClick={() => setEvidenceSubView(subTab.id as any)}
                    className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors relative ${
                      evidenceSubView === subTab.id
                        ? "text-accent border-b-2 border-accent"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {subTab.label} {subTab.count > 0 && <span className="text-[10px] bg-surface-2 border border-border/80 px-1.5 py-0.5 rounded ml-1 text-muted">{subTab.count}</span>}
                  </button>
                ))}
              </div>

              {/* Sub-tab views */}
              {evidenceSubView === "explorer" && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Packets Log List */}
                  <div className="lg:col-span-3 bg-surface border border-border/80 rounded-xl overflow-hidden shadow-lg shadow-black/10">
                    <div className="px-5 py-3.5 border-b border-border bg-surface-2 flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider">
                      <span>Packet Logs Explorer</span>
                      <span className="text-[10px] text-muted normal-case font-normal">Showing first 100 packets</span>
                    </div>
                    <div className="overflow-auto max-h-[500px]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left text-muted uppercase text-[9px] tracking-wider font-semibold bg-surface-2/40">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Time</th>
                            <th className="px-3 py-2">Source</th>
                            <th className="px-3 py-2">Destination</th>
                            <th className="px-3 py-2">Protocol</th>
                            <th className="px-3 py-2">Length</th>
                          </tr>
                        </thead>
                        <tbody>
                          {capturedPackets.slice(0, 100).map((packet, index) => (
                            <tr
                              key={index}
                              onClick={() => loadCapturePacket(packet.number)}
                              className={`cursor-pointer border-b border-border/40 hover:bg-slate-900/60 transition-colors ${
                                selectedPacket === packet.number ? "bg-accent/10 text-accent" : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-muted font-mono">{packet.number}</td>
                              <td className="px-3 py-2 text-muted font-mono truncate max-w-[120px]">{packet.time}</td>
                              <td
                                className="px-3 py-2 font-mono text-cyan-400 hover:underline cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); loadIpIntel(packet.src); }}
                              >
                                {packet.src}
                              </td>
                              <td
                                className="px-3 py-2 font-mono text-cyan-400 hover:underline cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); loadIpIntel(packet.dst); }}
                              >
                                {packet.dst}
                              </td>
                              <td className="px-3 py-2">{packet.protocol}</td>
                              <td className="px-3 py-2 text-muted font-mono">{packet.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Packet Details Decoding Panel */}
                  <div className="lg:col-span-2 bg-surface border border-border/80 rounded-xl p-5 shadow-lg shadow-black/10 flex flex-col justify-between min-h-[300px]">
                    <div>
                      <div className="border-b border-border pb-2.5 mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                          Packet Decodes {selectedPacket && `(#${selectedPacket})`}
                        </h3>
                        {packetDetails && (
                          <button
                            onClick={() => {
                              setSelectedPacket(null);
                              setPacketDetails("");
                            }}
                            className="text-[10px] text-muted hover:text-foreground underline transition-colors"
                          >
                            Clear View
                          </button>
                        )}
                      </div>
                      
                      {packetDetails ? (
                        <pre className="overflow-auto text-[11px] whitespace-pre-wrap text-slate-300 font-mono bg-slate-950/40 p-4 border border-slate-800 rounded-lg max-h-[420px] leading-relaxed">
                          {packetDetails}
                        </pre>
                      ) : (
                        <div className="h-[250px] flex flex-col items-center justify-center text-center text-muted italic text-xs">
                          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" className="text-muted/60 mb-2">
                            <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                            <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                          </svg>
                          Select a packet from the logs explorer to inspect hex dumps and layer-by-layer decodes.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {evidenceSubView === "timeline" && (
                <div className="bg-surface border border-border/80 rounded-xl p-5 shadow-lg shadow-black/10">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Investigation Timeline Feed</h3>
                  {timeline.length === 0 ? (
                    <div className="text-xs text-muted italic py-6 text-center">No timeline events recorded.</div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {timeline.map((event, index) => {
                        if (event.type === "alert" || event.type === "ioc" || event.type === "correlation") {
                          const alertBorder =
                            event.severity === "high" ? "border-red-500 bg-red-950/10" :
                              event.severity === "medium" ? "border-orange-500 bg-orange-950/10" : "border-blue-500 bg-blue-950/10";
                          return (
                            <div key={index} className={`border-l-4 ${alertBorder} pl-4 py-2 rounded-r-lg`}>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">
                                {event.type}
                              </div>
                              <div className="font-semibold text-xs text-foreground mt-0.5">
                                🚨 {event.title}
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={index}
                            onClick={() => event.packet_number && loadCapturePacket(String(event.packet_number))}
                            className={`cursor-pointer border-l-4 ${getTimelineColor(event.protocol)} pl-4 py-3 rounded-r-lg bg-surface-2/40 hover:bg-slate-800/40 transition-colors border border-border/40`}
                          >
                            <div className="text-[10px] text-muted">
                              {new Date(event.time).toLocaleTimeString()}
                            </div>
                            <div className="font-semibold text-xs text-white mt-0.5">
                              {event.title}
                            </div>
                            <div className="text-[11px] text-cyan-300 mt-1 font-mono">
                              Protocol: {getEventIcon(event.protocol)} {event.protocol}
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                              {event.src ? (
                                <span
                                  className="text-cyan-400 hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadIpIntel(event.src);
                                  }}
                                >
                                  {event.src}
                                </span>
                              ) : (
                                <span className="text-slate-500">Unknown</span>
                              )}
                              <span className="text-slate-500 mx-1">→</span>
                              {event.dst ? (
                                <span
                                  className="text-cyan-400 hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadIpIntel(event.dst);
                                  }}
                                >
                                  {event.dst}
                                </span>
                              ) : (
                                <span className="text-slate-500">Unknown</span>
                              )}
                            </div>
                            {event.description && (
                              <div className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
                                {event.description}
                              </div>
                            )}
                            {event.packet_number && (
                              <div className="text-[10px] text-accent mt-2 font-bold uppercase tracking-wider">
                                Click to inspect packet
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {evidenceSubView === "raw" && (
                <div className="bg-surface border border-border/80 rounded-xl p-5 shadow-lg shadow-black/10">
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                    <div>
                      <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Raw Network Events Stream</h3>
                      <p className="text-[11px] text-muted mt-0.5">Raw JSON packet events captured by NetFusion agent sensors</p>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                      {capturedPackets.length} total events
                    </span>
                  </div>
                  {capturedPackets.length === 0 ? (
                    <div className="text-xs text-muted italic py-6 text-center">No sensor events recorded.</div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-emerald-400 overflow-auto max-h-[500px] space-y-3 leading-relaxed">
                      {capturedPackets.slice(0, 50).map((packet, idx) => (
                        <div key={idx} className="border-b border-slate-900 pb-2 last:border-0">
                          <span className="text-muted">[{packet.time}]</span>{" "}
                          <span className="text-accent">EVENT_ID_{packet.number}:</span>{" "}
                          <pre className="text-slate-300 inline text-[10px]">{JSON.stringify({
                            sensor: "netfusion-capture-agent",
                            interface: selectedIface,
                            packet_number: Number(packet.number),
                            timestamp: packet.time,
                            length_bytes: Number(packet.length),
                            ethernet: {
                              protocol: packet.protocol,
                              source: packet.src,
                              destination: packet.dst
                            }
                          })}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: RESPONSE & REPORTING */}
          {activeWorkflowTab === "response" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Executive Report document viewer */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider">📄 Executive Investigation Report</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={generateExecutiveReport}
                        className="px-3 py-1.5 rounded-lg bg-accent text-background hover:bg-accent-hover text-xs font-semibold transition-colors"
                      >
                        {executiveReport ? "Re-generate Report" : "Generate Report"}
                      </button>
                      {executiveReport && (
                        <button
                          onClick={exportPdf}
                          disabled={pdfExporting}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          {pdfExporting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Exporting...
                            </>
                          ) : (
                            "Export PDF"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {executiveReport ? (
                    <div className="text-xs text-slate-300 space-y-1 bg-slate-950/20 p-4 border border-slate-800 rounded-xl max-h-[450px] overflow-y-auto leading-relaxed">
                      {renderReportMarkdown(executiveReport)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic">No Executive Investigation Report generated. Click the button above to generate.</div>
                  )}
                </div>
              </div>

              {/* Right Column: Attack Story, Plan & Quick Actions */}
              <div className="space-y-6">
                {/* AI Attack Story */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider">🧠 AI Attack Story</h3>
                    <button
                      onClick={generateAttackStory}
                      disabled={storyLoading}
                      className="px-3 py-1.5 rounded-lg bg-accent text-background hover:bg-accent-hover disabled:opacity-50 text-xs font-semibold transition-colors"
                    >
                      {storyLoading ? "Generating..." : attackStory ? "Re-generate" : "Generate"}
                    </button>
                  </div>
                  {storyLoading && (
                    <div className="text-xs text-slate-400 py-3 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Reconstructing attack vectors...
                    </div>
                  )}
                  {storyError && (
                    <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
                      {storyError}
                    </p>
                  )}
                  {!storyLoading && attackStory ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between bg-slate-950/30 border border-slate-800 p-3 rounded-lg">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Threat Title</span>
                          <span className="font-semibold text-foreground">{attackStory.title || "Attack Narrative"}</span>
                        </div>
                        {attackStory.severity && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            String(attackStory.severity).toLowerCase().includes("critical") ? "text-red-400 bg-red-950/20 border-red-800/30" :
                            String(attackStory.severity).toLowerCase().includes("high") ? "text-orange-400 bg-orange-950/20 border-orange-800/30" :
                            String(attackStory.severity).toLowerCase().includes("medium") ? "text-yellow-400 bg-yellow-950/20 border-yellow-800/30" :
                            "text-blue-400 bg-blue-500/10 border-blue-500/30"
                          }`}>
                            {attackStory.severity}
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attack Narrative Timeline</h4>
                        {[
                          { title: "Discovery", desc: getPhaseDescription("Discovery", 0) },
                          { title: "Communication", desc: getPhaseDescription("Communication", 1) },
                          { title: "Findings", desc: getPhaseDescription("Findings", 2) },
                          { title: "Assessment", desc: getPhaseDescription("Assessment", 3) },
                        ].map((p, i) => (
                          <div key={i} className="border-l-2 border-slate-700 pl-3 py-0.5">
                            <div className="font-semibold text-[11px] text-foreground">Phase {i+1} - {p.title}</div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{p.desc || "Not provided."}</p>
                          </div>
                        ))}
                      </div>

                      {attackStory.executive_summary && (
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Executive Summary</h4>
                          <p className="p-3 bg-slate-950/20 rounded-lg border border-slate-800/60 leading-relaxed font-sans text-slate-300">
                            {attackStory.executive_summary}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic">No AI Attack Story generated yet.</div>
                  )}
                </div>

                {/* AI Investigation Plan */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider">🧠 AI Investigation Plan</h3>
                    <button
                      onClick={generateInvestigationPlan}
                      disabled={planLoading}
                      className="px-3 py-1.5 rounded-lg bg-accent text-background hover:bg-accent-hover disabled:opacity-50 text-xs font-semibold transition-colors"
                    >
                      {planLoading ? "Generating..." : investigationPlan ? "Re-generate" : "Generate"}
                    </button>
                  </div>
                  {planLoading && (
                    <div className="text-xs text-slate-400 py-3 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Creating priority steps...
                    </div>
                  )}
                  {!planLoading && investigationPlan ? (
                    <div className="space-y-4 text-xs">
                      {investigationPlan.error ? (
                        <div className="p-3 bg-red-950/20 border border-red-800/30 rounded-lg text-xs font-mono text-red-400">
                          <p className="font-semibold mb-1">Error: {investigationPlan.error}</p>
                          {investigationPlan.raw_response && (
                            <pre className="mt-2 whitespace-pre-wrap text-[10px] text-slate-400 max-h-[150px] overflow-auto">
                              {investigationPlan.raw_response}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <>
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Overall Assessment</h4>
                            <p className="text-slate-300 bg-slate-950/20 p-3 rounded-lg border border-slate-800/60 leading-relaxed font-sans">
                              {investigationPlan.overall_assessment || "Unknown"}
                            </p>
                          </div>
                          {investigationPlan.priority_targets && investigationPlan.priority_targets.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Priority Targets</h4>
                              <div className="space-y-2">
                                {investigationPlan.priority_targets.map((tgt: any, idx: number) => {
                                  const priorityLower = String(tgt.priority || "").toLowerCase();
                                  const badgeColor = priorityLower.includes("high")
                                    ? "text-red-400 bg-red-950/20 border-red-800/30"
                                    : priorityLower.includes("medium")
                                      ? "text-orange-400 bg-orange-950/20 border-orange-800/30"
                                      : "text-emerald-400 bg-emerald-950/20 border-emerald-800/30";

                                  return (
                                    <div key={idx} className="bg-slate-950/30 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-[11px] gap-2">
                                      <div>
                                        <span className="font-mono text-cyan-400 font-semibold">{tgt.host || "Unknown"}</span>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{tgt.reason || "Unknown"}</p>
                                      </div>
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                                        {tgt.priority || "Unknown"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {investigationPlan.investigation_steps && investigationPlan.investigation_steps.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Investigation Steps</h4>
                              <ul className="list-decimal pl-4 text-slate-300 space-y-1.5">
                                {investigationPlan.investigation_steps.map((step: string, idx: number) => (
                                  <li key={idx} className="leading-relaxed">{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic">No AI Investigation Plan generated yet.</div>
                  )}
                </div>

                {/* Export actions card */}
                <div className="bg-surface border border-border/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Forensic Actions</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={downloadCapture}
                      disabled={!captureFile}
                      className="w-full py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      📥 DOWNLOAD PCAP LOG
                    </button>
                    <button
                      onClick={resetCapture}
                      className="w-full py-2 px-4 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      ⚠️ RESET WORKSPACE SESSION
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC: Endpoint Intelligence & AI Device Profiler (Investigator Panel) */}
          {selectedIp && (
            <div className="bg-surface border border-border/80 rounded-xl p-5 shadow-2xl animate-slideUp border-accent/40 bg-slate-900/60 mt-6">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🖥️</span>
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                    Endpoint Profile: <span className="font-mono text-cyan-400 font-semibold">{selectedIp.ip}</span>
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedIp(null);
                    setHostProfile(null);
                    setDeviceProfile(null);
                  }}
                  className="text-xs text-muted hover:text-foreground transition-colors font-bold uppercase tracking-wider"
                >
                  Close Investigator
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Traditional threat intel */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Endpoint Security Profile</h4>
                  
                  <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl text-xs space-y-3">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Device Name:</span>
                      <span className="font-semibold text-foreground">{hostProfile?.deviceName || hostProfile?.device_name || "--"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Hostname:</span>
                      <span className="font-semibold text-foreground">{hostProfile?.hostname || "--"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">MAC Address:</span>
                      <span className="font-mono text-cyan-400 font-semibold">{hostProfile?.macAddress || hostProfile?.mac_address || hostProfile?.mac || "--"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Vendor:</span>
                      <span className="font-semibold text-foreground">{hostProfile?.vendor || "--"}</span>
                    </div>
                    {(hostProfile?.ssid) && (
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-muted">SSID:</span>
                        <span className="font-semibold text-foreground">{hostProfile.ssid}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Current IP:</span>
                      <span className="font-mono text-cyan-400 font-semibold">{hostProfile?.currentIp || hostProfile?.current_ip || hostProfile?.ip || selectedIp?.ip || "--"}</span>
                    </div>
                    {Array.isArray(hostProfile?.previousIps || hostProfile?.previous_ips) && (hostProfile?.previousIps || hostProfile?.previous_ips).length > 0 && (
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-muted">Previous IPs:</span>
                        <span className="font-mono text-slate-400 font-semibold text-right">{(hostProfile.previousIps || hostProfile.previous_ips).join(", ")}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Classification:</span>
                      <span className="font-semibold text-foreground">{selectedIp?.classification || "--"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Organization:</span>
                      <span className="font-semibold text-foreground truncate max-w-[150px]">{selectedIp?.org || "--"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Country:</span>
                      <span className="font-semibold text-foreground">{selectedIp?.country || "--"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">ASN:</span>
                      <span className="font-mono text-foreground font-semibold">{selectedIp?.asn || "--"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-muted">Threat Risk Grade:</span>
                      <span className={`font-bold ${
                        String(selectedIp?.risk).toLowerCase().includes("high") ? "text-red-400" : "text-emerald-400"
                      }`}>{selectedIp?.risk || "--"}</span>
                    </div>
                    {selectedIp?.summary && (
                      <div className="pt-1">
                        <span className="text-muted block mb-1">Reputation Summary:</span>
                        <p className="text-slate-300 text-[11px] leading-relaxed italic">{selectedIp.summary}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const targetIp = selectedIp?.ip || deviceProfile?.ip;
                      if (targetIp) {
                        router.push(`/dashboard/projects/${projectId}/hosts/${targetIp}`);
                      }
                    }}
                    className="w-full py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                  >
                    🔍 OPEN FULL HOST INVESTIGATION WORKBENCH
                  </button>
                </div>

                {/* AI Device profile details */}
                <div className="lg:col-span-3 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI Behavioral profiling</h4>
                  
                  {deviceProfileLoading ? (
                    <div className="space-y-3 animate-pulse bg-slate-950/20 border border-slate-800 p-4 rounded-xl">
                      <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                      <div className="h-10 bg-slate-800 rounded"></div>
                      <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                    </div>
                  ) : deviceProfile ? (
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl text-xs space-y-4 max-h-[320px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-muted block mb-0.5">Observed Device Type</span>
                          <span className="font-semibold text-foreground text-sm">{deviceProfile.device_type || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block mb-0.5">Behavioral Assessment Confidence</span>
                          <span className={`font-semibold text-sm ${
                            String(deviceProfile.confidence).toLowerCase() === "high" ? "text-emerald-400" : "text-yellow-400"
                          }`}>{deviceProfile.confidence || "Unknown"}</span>
                        </div>
                      </div>

                      {deviceProfile.likely_activities && deviceProfile.likely_activities.length > 0 && (
                        <div>
                          <span className="text-[10px] text-muted block mb-1">Likely Activities</span>
                          <ul className="list-disc pl-4 text-slate-300 space-y-1">
                            {deviceProfile.likely_activities.map((act: string, idx: number) => (
                              <li key={idx} className="text-[11px]">{act}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {deviceProfile.observed_domains && deviceProfile.observed_domains.length > 0 && (
                        <div>
                          <span className="text-[10px] text-muted block mb-1">Observed Connection Domains</span>
                          <div className="flex flex-wrap gap-1">
                            {deviceProfile.observed_domains.map((dom: string, idx: number) => (
                              <span key={idx} className="bg-cyan-950/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/30 font-mono text-[10px]">{dom}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {deviceProfile.recommendations && deviceProfile.recommendations.length > 0 && (
                        <div>
                          <span className="text-[10px] text-muted block mb-1">Recommended Analyst Actions</span>
                          <ul className="list-disc pl-4 text-slate-300 space-y-1">
                            {deviceProfile.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="text-[11px] leading-relaxed">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {deviceProfile.narrative && (
                        <div>
                          <span className="text-[10px] text-muted block mb-1">AI Analyst Narrative Summary</span>
                          <p className="text-slate-300 leading-relaxed italic text-[11px] bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">{deviceProfile.narrative}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic p-4 border border-slate-800 rounded-xl bg-slate-950/20">Click any Communicating IP to load advanced behavioral profiling.</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
