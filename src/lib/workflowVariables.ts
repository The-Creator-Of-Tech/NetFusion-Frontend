import type { PlaybookStep } from "@/types/api";

export interface WorkflowVariable {
  name: string;
  type: "file" | "number" | "array" | "string" | "boolean" | "object";
  value: any;
  createdBy: string;
  stepNumber: number;
  createdAt: string;
}

/**
 * Infers available workflow variables from the steps preceding the current step.
 * Returns variables grouped by the step that produces them.
 */
export function inferVariablesFromSteps(
  steps: PlaybookStep[],
  currentStepOrder: number
): WorkflowVariable[] {
  const previousSteps = steps
    .filter((s) => s.order < currentStepOrder)
    .sort((a, b) => a.order - b.order);

  const variables: WorkflowVariable[] = [];

  previousSteps.forEach((step, index) => {
    const stepNum = step.order + 1;
    const stepName = step.name || `Step ${stepNum}`;
    const executor = (step.executor || "").toLowerCase();
    const nameLower = stepName.toLowerCase();
    const mockTimestamp = new Date(Date.now() - (steps.length - index) * 60000).toISOString();

    // 1. Packet Capture Variables
    if (executor === "packet_capture" || nameLower.includes("capture") || nameLower.includes("packet")) {
      variables.push({
        name: "capture_file",
        type: "file",
        value: "C:\\Capture\\capture001.pcapng",
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "packet_count",
        type: "number",
        value: 475,
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "capture_duration",
        type: "number",
        value: 30,
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      return; // Skip fallback
    }

    // 2. PCAP Analysis / TShark Variables
    if (executor === "tshark" || nameLower.includes("analysis") || nameLower.includes("pcap")) {
      variables.push({
        name: "dns_queries",
        type: "array",
        value: ["google.com", "malicious-domain.ru", "internal-dns.local"],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "http_hosts",
        type: "array",
        value: ["httpbin.org", "compromised-site.com"],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "protocols",
        type: "array",
        value: ["TCP", "UDP", "DNS", "HTTP", "TLS"],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "conversations",
        type: "array",
        value: [{ src: "10.0.0.5", dst: "192.168.1.10" }],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      return; // Skip fallback
    }

    // 3. AI Investigation Variables
    if (executor === "ai" || nameLower.includes("ai") || nameLower.includes("investigation")) {
      variables.push({
        name: "ai_summary",
        type: "string",
        value: "Reconstructed threat scenario: An internal host (10.0.0.5) initiated multiple DNS requests to high-risk domain 'malicious-domain.ru' followed by a short HTTP session. Highly recommended to isolate the host immediately.",
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "risk_score",
        type: "number",
        value: 85,
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "recommendations",
        type: "array",
        value: ["Isolate host 10.0.0.5", "Block egress to malicious-domain.ru"],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      return; // Skip fallback
    }

    // 4. Nmap Scan Variables
    if (executor === "nmap" || nameLower.includes("scan") || nameLower.includes("recon")) {
      variables.push({
        name: "host",
        type: "string",
        value: "10.0.0.5",
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "open_ports",
        type: "array",
        value: [22, 80, 443],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      variables.push({
        name: "services",
        type: "array",
        value: [
          { port: 22, service: "ssh" },
          { port: 80, service: "http" },
        ],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      return; // Skip fallback
    }

    // 5. IOC Lookup Variables
    if (executor === "ioc" || nameLower.includes("ioc") || nameLower.includes("lookup")) {
      variables.push({
        name: "ioc_findings",
        type: "array",
        value: [
          { ioc: "malicious-domain.ru", malicious: true, details: "Flagged by 5 threat sources." },
        ],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      return; // Skip fallback
    }

    // 6. MITRE Technique Variables
    if (executor === "mitre" || nameLower.includes("mitre")) {
      variables.push({
        name: "mitre_techniques",
        type: "array",
        value: ["T1046", "T1071"],
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      return; // Skip fallback
    }

    // 7. Generate Report Variables
    if (executor === "report" || nameLower.includes("report")) {
      variables.push({
        name: "report_path",
        type: "string",
        value: "C:\\Reports\\incident_report.pdf",
        createdBy: stepName,
        stepNumber: stepNum,
        createdAt: mockTimestamp,
      });
      return; // Skip fallback
    }

    // 8. Fallback / Default Variables for custom/manual steps
    variables.push({
      name: `step_${step.id ? step.id.substring(0, 8) : stepNum}_confirmed`,
      type: "boolean",
      value: true,
      createdBy: stepName,
      stepNumber: stepNum,
      createdAt: mockTimestamp,
    });
  });

  return variables;
}
