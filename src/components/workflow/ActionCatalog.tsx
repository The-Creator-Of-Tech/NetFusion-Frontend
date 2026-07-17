"use client";

import React, { useState, useMemo } from "react";

export interface ActionDefinition {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  executor: string;
  description: string;
  version: string;
  configSchema: Record<string, any>;
}

// Category lists matching prompt specifications
export const CATEGORIES = [
  "All",
  "Network Discovery",
  "Packet Analysis",
  "Threat Intelligence",
  "AI",
  "Reporting",
  "Workflow",
  "Notification"
] as const;

export type ActionCategory = typeof CATEGORIES[number];

// Helper to render high quality SVG icons for categories
const getCategoryIcon = (category: ActionCategory) => {
  switch (category) {
    case "Network Discovery":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case "Packet Analysis":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "Threat Intelligence":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "AI":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "Reporting":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "Workflow":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "Notification":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.07 6.07 0 00-1-3.59M12 3v1m0 16v1m-7-5h5l-1.405-1.405A2.032 2.032 0 014 14.158V11a6.07 6.07 0 011-3.59M6 16v.01M10 20a2 2 0 004 0" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
};

const getCategoryColorClass = (category: string) => {
  switch (category) {
    case "Network Discovery":
      return {
        bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        hover: "hover:border-blue-500/40 hover:bg-blue-500/5",
        text: "text-blue-400"
      };
    case "Packet Analysis":
      return {
        bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        hover: "hover:border-purple-500/40 hover:bg-purple-500/5",
        text: "text-purple-400"
      };
    case "Threat Intelligence":
      return {
        bg: "bg-red-500/10 text-red-400 border-red-500/20",
        hover: "hover:border-red-500/40 hover:bg-red-500/5",
        text: "text-red-400"
      };
    case "AI":
      return {
        bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        hover: "hover:border-cyan-500/40 hover:bg-cyan-500/5",
        text: "text-cyan-400"
      };
    case "Reporting":
      return {
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        hover: "hover:border-emerald-500/40 hover:bg-emerald-500/5",
        text: "text-emerald-400"
      };
    case "Workflow":
      return {
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        hover: "hover:border-amber-500/40 hover:bg-amber-500/5",
        text: "text-amber-400"
      };
    case "Notification":
      return {
        bg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
        hover: "hover:border-pink-500/40 hover:bg-pink-500/5",
        text: "text-pink-400"
      };
    default:
      return {
        bg: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        hover: "hover:border-gray-500/40 hover:bg-gray-500/5",
        text: "text-gray-400"
      };
  }
};

// Complete structured action definition catalog
export const ACTION_DEFINITIONS: ActionDefinition[] = [
  // Network Discovery
  {
    id: "nmap_scan",
    name: "Nmap Scan",
    category: "Network Discovery",
    icon: getCategoryIcon("Network Discovery"),
    executor: "nmap",
    description: "Execute a comprehensive network scanning task with custom script and target options.",
    version: "1.0",
    configSchema: {
      target: {
        type: "text",
        required: true,
        label: "Scan Target",
        placeholder: "e.g. 192.168.1.1 or 10.0.0.0/24",
        description: "IP address, host, or network range to scan."
      },
      ports: {
        type: "tags",
        label: "Target Ports",
        placeholder: "e.g. 80, 443, 22",
        description: "Specify ports or ranges to scan."
      },
      scan_type: {
        type: "select",
        label: "Scan Profile",
        options: [
          { value: "quick", label: "Quick Scan" },
          { value: "full", label: "Full Scan" },
          { value: "vuln", label: "Vulnerability Scan" }
        ],
        default: "quick",
        description: "Scan type profiling."
      }
    }
  },
  {
    id: "port_scan",
    name: "Port Scan",
    category: "Network Discovery",
    icon: getCategoryIcon("Network Discovery"),
    executor: "nmap",
    description: "Scan typical TCP/UDP ports on target hosts to uncover exposed services and surface risks.",
    version: "1.0",
    configSchema: {
      target: {
        type: "text",
        required: true,
        label: "Scan Target",
        placeholder: "e.g. 192.168.1.1"
      },
      ports: {
        type: "text",
        label: "Ports Range",
        default: "1-1024",
        placeholder: "e.g. 1-1024 or 80,443"
      }
    }
  },
  {
    id: "service_detection",
    name: "Service Detection",
    category: "Network Discovery",
    icon: getCategoryIcon("Network Discovery"),
    executor: "nmap",
    description: "Query open ports directly to determine details on running services, software versions, and protocols.",
    version: "1.0",
    configSchema: {
      target: {
        type: "text",
        required: true,
        label: "Target Host"
      }
    }
  },
  {
    id: "os_detection",
    name: "OS Detection",
    category: "Network Discovery",
    icon: getCategoryIcon("Network Discovery"),
    executor: "nmap",
    description: "Analyze network response fingerprints to identify target host operating systems and versions.",
    version: "1.0",
    configSchema: {
      target: {
        type: "text",
        required: true,
        label: "Target Host"
      }
    }
  },

  // Packet Analysis
  {
    id: "packet_capture",
    name: "Live Packet Capture",
    category: "Packet Analysis",
    icon: getCategoryIcon("Packet Analysis"),
    executor: "packet_capture",
    description: "Perform real-time capture of packets passing through a selected network interface.",
    version: "1.0",
    configSchema: {
      interface: {
        type: "select",
        source: "capture_interfaces",
        label: "Interface",
        description: "Select the network interface to perform packet capture on."
      },
      duration: {
        type: "number",
        default: 30,
        label: "Duration",
        description: "How long to capture network traffic (in seconds)."
      },
      filter: {
        type: "text",
        label: "Filter",
        placeholder: "e.g. tcp or udp",
        description: "BPF filter to limit captured traffic."
      },
      promiscuous: {
        type: "boolean",
        label: "Promiscuous",
        description: "Enable promiscuous mode to capture all traffic on the segment."
      }
    }
  },
  {
    id: "analyze_pcap",
    name: "Analyze PCAP",
    category: "Packet Analysis",
    icon: getCategoryIcon("Packet Analysis"),
    executor: "tshark",
    description: "Parse and audit PCAP capture files to extract statistics and locate security anomalies.",
    version: "1.0",
    configSchema: {
      pcap_file: {
        type: "text",
        required: true,
        label: "PCAP File Path",
        placeholder: "e.g. /tmp/capture.pcap"
      },
      filter: {
        type: "text",
        label: "Display Filter",
        placeholder: "e.g. http.request or ip.addr == 10.0.0.1"
      }
    }
  },
  {
    id: "follow_tcp_stream",
    name: "Follow TCP Stream",
    category: "Packet Analysis",
    icon: getCategoryIcon("Packet Analysis"),
    executor: "tshark",
    description: "Extract and reconstruct payload sequences from a single TCP conversation to inspect contents.",
    version: "1.0",
    configSchema: {
      pcap_file: {
        type: "text",
        required: true,
        label: "PCAP File Path"
      },
      stream_index: {
        type: "number",
        default: 0,
        label: "TCP Stream Index"
      }
    }
  },

  // Threat Intelligence
  {
    id: "ioc_lookup",
    name: "IOC Lookup",
    category: "Threat Intelligence",
    icon: getCategoryIcon("Threat Intelligence"),
    executor: "ioc",
    description: "Validate indicators of compromise (IPs, hashes, domains) against threat intelligence repositories.",
    version: "1.0",
    configSchema: {
      indicators: {
        type: "tags",
        required: true,
        label: "IOC Indicators",
        placeholder: "Enter IPs, domains, hashes..."
      }
    }
  },
  {
    id: "virustotal",
    name: "VirusTotal",
    category: "Threat Intelligence",
    icon: getCategoryIcon("Threat Intelligence"),
    executor: "ioc",
    description: "Scan file hashes, domains, or external IPs using the VirusTotal Multi-Engine Intelligence aggregator.",
    version: "1.0",
    configSchema: {
      resource: {
        type: "text",
        required: true,
        label: "Scan Resource",
        placeholder: "Hash, IP, Domain, or URL"
      }
    }
  },
  {
    id: "mitre_mapping",
    name: "MITRE Mapping",
    category: "Threat Intelligence",
    icon: getCategoryIcon("Threat Intelligence"),
    executor: "mitre",
    description: "Associate security observations or steps with tactical MITRE ATT&CK techniques.",
    version: "1.0",
    configSchema: {
      techniques: {
        type: "multiselect",
        label: "ATT&CK Techniques",
        options: [
          { value: "T1046", label: "T1046: Network Service Scanning" },
          { value: "T1190", label: "T1190: Exploit Public-Facing Application" },
          { value: "T1071", label: "T1071: Application Layer Protocol" },
          { value: "T1566", label: "T1566: Phishing" }
        ]
      }
    }
  },
  {
    id: "cve_lookup",
    name: "CVE Lookup",
    category: "Threat Intelligence",
    icon: getCategoryIcon("Threat Intelligence"),
    executor: "ioc",
    description: "Inspect specific CVE IDs in national vulnerability databases to identify CVSS severity and remediations.",
    version: "1.0",
    configSchema: {
      cve_id: {
        type: "text",
        required: true,
        label: "CVE ID",
        placeholder: "e.g. CVE-2024-1234"
      }
    }
  },

  // AI
  {
    id: "ai_investigation",
    name: "AI Investigation",
    category: "AI",
    icon: getCategoryIcon("AI"),
    executor: "ai",
    description: "Utilize generative AI to analyze security indicators and reconstruct operational context of anomalies.",
    version: "1.0",
    configSchema: {
      prompt_template: {
        type: "textarea",
        label: "System Prompt Context",
        description: "Optional custom system guidance for the AI investigator model."
      },
      temperature: {
        type: "number",
        default: 0.2,
        label: "Temperature"
      }
    }
  },
  {
    id: "ai_summary",
    name: "AI Summary",
    category: "AI",
    icon: getCategoryIcon("AI"),
    executor: "ai",
    description: "Generate structured, human-readable executive summaries of large trace, packet or scan datasets.",
    version: "1.0",
    configSchema: {
      include_raw_logs: {
        type: "boolean",
        default: false,
        label: "Include Raw Log Appendices"
      }
    }
  },
  {
    id: "ai_recommendation",
    name: "AI Recommendation",
    category: "AI",
    icon: getCategoryIcon("AI"),
    executor: "ai",
    description: "Generate tailored risk mitigation advice and specific containment instructions via AI models.",
    version: "1.0",
    configSchema: {
      context_json: {
        type: "json",
        label: "Custom Assessment Context (JSON)",
        description: "Tailored variables and scope for target system environment."
      }
    }
  },

  // Reporting
  {
    id: "generate_report",
    name: "Generate Report",
    category: "Reporting",
    icon: getCategoryIcon("Reporting"),
    executor: "report",
    description: "Compile and render a comprehensive incident summary report in PDF format suitable for leadership review.",
    version: "1.0",
    configSchema: {
      report_title: {
        type: "text",
        label: "Custom Report Title",
        placeholder: "Incident Summary Report"
      },
      confidentiality: {
        type: "select",
        label: "Classification",
        options: [
          { value: "public", label: "Public" },
          { value: "internal", label: "Internal Only" },
          { value: "confidential", label: "Strictly Confidential" }
        ],
        default: "internal"
      }
    }
  },
  {
    id: "export_evidence",
    name: "Export Evidence",
    category: "Reporting",
    icon: getCategoryIcon("Reporting"),
    executor: "report",
    description: "Collect, sanitize and bundle capture logs, notes, and metrics into a zip bundle for export.",
    version: "1.0",
    configSchema: {
      anonymize_ips: {
        type: "boolean",
        default: true,
        label: "Anonymize Internal IP Addresses"
      }
    }
  },

  // Workflow
  {
    id: "delay",
    name: "Delay",
    category: "Workflow",
    icon: getCategoryIcon("Workflow"),
    executor: "manual",
    description: "Suspend playbook progression for a designated duration before initiating subsequent stages.",
    version: "1.0",
    configSchema: {
      duration_seconds: {
        type: "number",
        default: 60,
        label: "Delay Duration (seconds)"
      }
    }
  },
  {
    id: "manual_approval",
    name: "Manual Approval",
    category: "Workflow",
    icon: getCategoryIcon("Workflow"),
    executor: "manual",
    description: "Require direct authorization from a security analyst or administrator to resume playbook steps.",
    version: "1.0",
    configSchema: {
      reviewer_instructions: {
        type: "textarea",
        label: "Review Instructions",
        placeholder: "Please verify that firewall rules have been deployed..."
      },
      password_required: {
        type: "password",
        label: "Re-authenticate (Password Protection)",
        placeholder: "Enter password if required to sign off"
      }
    }
  },
  {
    id: "condition",
    name: "Condition",
    category: "Workflow",
    icon: getCategoryIcon("Workflow"),
    executor: "manual",
    description: "Enforce dynamic branching logic to execute steps based on values of current findings or states.",
    version: "1.0",
    configSchema: {
      expression: {
        type: "text",
        required: true,
        label: "Conditional Expression",
        placeholder: "e.g. results.nmap.open_ports > 0"
      }
    }
  },

  // Notification
  {
    id: "email",
    name: "Email",
    category: "Notification",
    icon: getCategoryIcon("Notification"),
    executor: "manual",
    description: "Transmit a rich status alert or escalation notification email to security lists and managers.",
    version: "1.0",
    configSchema: {
      recipients: {
        type: "tags",
        required: true,
        label: "Recipients",
        placeholder: "e.g. secops@org.com"
      },
      subject: {
        type: "text",
        label: "Subject Line",
        default: "NetFusion Incident Alert"
      },
      body: {
        type: "textarea",
        label: "Email Body Template"
      }
    }
  },
  {
    id: "slack",
    name: "Slack",
    category: "Notification",
    icon: getCategoryIcon("Notification"),
    executor: "manual",
    description: "Publish alert events, status updates, or summaries directly into a configured Slack channel.",
    version: "1.0",
    configSchema: {
      webhook_url: {
        type: "text",
        required: true,
        label: "Slack Webhook URL"
      },
      channel: {
        type: "text",
        label: "Channel Name",
        placeholder: "#alerts"
      }
    }
  },
  {
    id: "teams",
    name: "Teams",
    category: "Notification",
    icon: getCategoryIcon("Notification"),
    executor: "manual",
    description: "Post operational notifications and containment events straight into Microsoft Teams channels.",
    version: "1.0",
    configSchema: {
      webhook_url: {
        type: "text",
        required: true,
        label: "Teams Webhook URL"
      }
    }
  }
];

interface ActionCatalogProps {
  onSelect: (action: ActionDefinition) => void;
  onCancel: () => void;
}

export default function ActionCatalog({ onSelect, onCancel }: ActionCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ActionCategory>("All");

  // Filter actions based on search input and active category
  const filteredActions = useMemo(() => {
    return ACTION_DEFINITIONS.filter((action) => {
      const matchesCategory =
        activeCategory === "All" || action.category === activeCategory;
      
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        action.name.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.executor.toLowerCase().includes(query) ||
        action.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  // Compute item count per category for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<ActionCategory, number> = {
      All: ACTION_DEFINITIONS.length,
      "Network Discovery": 0,
      "Packet Analysis": 0,
      "Threat Intelligence": 0,
      AI: 0,
      Reporting: 0,
      Workflow: 0,
      Notification: 0,
    };

    ACTION_DEFINITIONS.forEach((action) => {
      if (action.category in counts) {
        counts[action.category as ActionCategory]++;
      }
    });

    return counts;
  }, []);

  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col h-[520px] max-h-[520px] overflow-hidden text-foreground">
      {/* Header Panel */}
      <div className="px-5 py-3.5 border-b border-border bg-surface-2 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Action Template Catalog
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            Select a template to configure and add a structured workflow step.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold px-2.5 py-1 rounded bg-surface border border-border hover:text-foreground text-muted hover:bg-surface-2 transition-all"
        >
          Cancel
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="px-5 py-3 border-b border-border bg-surface-2 shrink-0 flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action name, description, executor..."
            className="w-full pl-9 pr-8 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace: Left Sidebar Categories, Right Cards Grid */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-surface">
        {/* Left Category Sidebar */}
        <aside className="w-48 border-r border-border bg-surface-2 p-3 overflow-y-auto shrink-0 flex flex-col gap-1">
          <p className="text-[9px] font-bold text-muted/65 uppercase tracking-widest px-2 mb-1.5">
            Categories
          </p>
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            const count = categoryCounts[category];

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <span className="truncate">{category}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-surface border border-border text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Right Cards Scroll View */}
        <main className="flex-1 p-4 overflow-y-auto min-w-0 bg-surface">
          {filteredActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <svg className="w-8 h-8 text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-semibold text-muted">No templates found</p>
              <p className="text-[11px] text-muted mt-0.5">
                Try adjusting your search filters or select a different category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                }}
                className="mt-3 text-[11px] font-semibold text-accent hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
              {filteredActions.map((action) => {
                const colorConfig = getCategoryColorClass(action.category);

                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => onSelect(action)}
                    className={`text-left border border-border bg-surface-2 rounded-xl p-3.5 flex flex-col h-fit justify-between transition-all duration-200 hover:-translate-y-0.5 cursor-pointer outline-none group ${colorConfig.hover}`}
                  >
                    <div className="w-full">
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg border ${colorConfig.bg}`}>
                          {action.icon}
                        </div>
                        <span className="text-[9px] font-mono text-muted/70 px-1 py-0.5 border border-border rounded bg-surface">
                          v{action.version}
                        </span>
                      </div>

                      {/* Card Content */}
                      <h4 className="text-xs font-bold text-foreground group-hover:text-accent transition-colors truncate">
                        {action.name}
                      </h4>
                      <p className="text-[11px] text-muted mt-1 leading-relaxed line-clamp-2 h-[34px]">
                        {action.description}
                      </p>
                    </div>

                    {/* Card Footer badges */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border/60 w-full">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colorConfig.bg}`}>
                        {action.category}
                      </span>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded text-muted bg-surface border border-border">
                        Exec: {action.executor}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
