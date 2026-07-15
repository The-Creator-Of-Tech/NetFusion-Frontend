// NOTE: This file is imported ONLY from API routes (server-side).
// @react-pdf/renderer is in serverExternalPackages and must never be imported
// by any client component.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReportAsset {
  ip: string | null;
  hostname: string | null;
  type: string;
  tags: string[];
  findingCount: number;
}

export interface ReportFinding {
  type: string;
  severity: string;
  description: string;
  assetLabel: string;
}

export interface ReportTimelineEntry {
  action: string;
  createdAt: string;
  userName: string | null;
}

export interface AiContent {
  executiveSummary: string;
  keyFindings: { severity: string; title: string; description: string; recommendation: string }[];
  assetSummary: string;
  recommendations: { priority: string; title: string; description: string }[];
  riskLevel: string;
}

export interface ReportData {
  title: string;
  projectName: string;
  generatedAt: string;
  generatedBy: string;
  sections: string[];
  assets: ReportAsset[];
  findings: ReportFinding[];
  timeline: ReportTimelineEntry[];
  noteText: string;
  ai: AiContent;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const C = {
  bg:       "#0d1117",
  surface:  "#161b22",
  surface2: "#21262d",
  border:   "#30363d",
  fg:       "#e6edf3",
  muted:    "#8b949e",
  accent:   "#00b4d8",
  danger:   "#f85149",
  success:  "#3fb950",
  white:    "#ffffff",
  // severity
  critical: "#f85149",
  high:     "#f0883e",
  medium:   "#d29922",
  low:      "#58a6ff",
  info:     "#8b949e",
};

const SEV_COLOR: Record<string, string> = {
  CRITICAL: C.critical,
  HIGH:     C.high,
  MEDIUM:   C.medium,
  LOW:      C.low,
  INFO:     C.info,
};

const PRI_COLOR: Record<string, string> = {
  HIGH:   C.critical,
  MEDIUM: C.medium,
  LOW:    C.low,
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    color: C.fg,
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },

  // Header band
  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 20,
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  logoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoDot: {
    width: 18,
    height: 18,
    backgroundColor: C.accent,
    borderRadius: 4,
  },
  logoText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.fg,
    letterSpacing: 0.5,
  },
  headerMeta: {
    fontSize: 7,
    color: C.muted,
    textAlign: "right",
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 9,
    color: C.muted,
  },

  // Risk level badge in header
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  riskLabel: {
    fontSize: 8,
    color: C.muted,
  },
  riskValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  body: {
    paddingHorizontal: 36,
  },

  // Section
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paragraph: {
    fontSize: 9,
    color: C.fg,
    lineHeight: 1.6,
    marginBottom: 6,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.surface2,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tableRowAlt: {
    backgroundColor: "#0f151c",
  },
  tableCell: {
    fontSize: 8,
    color: C.fg,
  },
  tableCellMono: {
    fontSize: 8,
    color: C.fg,
    fontFamily: "Courier",
  },
  tableCellMuted: {
    fontSize: 8,
    color: C.muted,
  },

  // Severity / badge pill
  pill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },

  // Finding card
  findingCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 6,
  },
  findingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 5,
  },
  findingTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.fg,
    flex: 1,
  },
  findingAsset: {
    fontSize: 7,
    color: C.muted,
    fontFamily: "Courier",
  },
  findingDesc: {
    fontSize: 8,
    color: C.fg,
    lineHeight: 1.5,
  },
  findingRec: {
    fontSize: 8,
    color: C.muted,
    lineHeight: 1.4,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // Recommendation card
  recCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 6,
  },
  recPriority: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: "flex-start",
    minWidth: 34,
    textAlign: "center",
  },
  recContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.fg,
    marginBottom: 3,
  },
  recDesc: {
    fontSize: 8,
    color: C.muted,
    lineHeight: 1.4,
  },

  // Timeline
  timelineRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 5,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginTop: 2,
    flexShrink: 0,
  },
  timelineAction: {
    flex: 1,
    fontSize: 8,
    color: C.fg,
    lineHeight: 1.4,
  },
  timelineMeta: {
    fontSize: 7,
    color: C.muted,
    textAlign: "right",
    width: 100,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: C.muted,
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function SevBadge({ severity }: { severity: string }) {
  const color = SEV_COLOR[severity] ?? C.info;
  return (
    <Text style={[s.pill, { color: C.bg, backgroundColor: color }]}>
      {severity}
    </Text>
  );
}

function PriLabel({ priority }: { priority: string }) {
  const color = PRI_COLOR[priority] ?? C.low;
  return (
    <Text style={[s.recPriority, { color: C.bg, backgroundColor: color }]}>
      {priority}
    </Text>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const color = SEV_COLOR[risk] ?? C.info;
  return (
    <View style={s.riskBadge}>
      <Text style={s.riskLabel}>Overall Risk:</Text>
      <Text style={[s.riskValue, { color: C.bg, backgroundColor: color }]}>
        {risk}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Document ───────────────────────────────────────────────────────────────────

export function ReportDocument({ data }: { data: ReportData }) {
  const inc = (s: string) => data.sections.includes(s);

  return (
    <Document
      title={data.title}
      author="NetFusion"
      subject={`Security Investigation Report — ${data.projectName}`}
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View style={s.logoBox}>
              <View style={s.logoDot} />
              <Text style={s.logoText}>NetFusion</Text>
            </View>
            <View>
              <Text style={s.headerMeta}>Generated: {fmtDate(data.generatedAt)}</Text>
              <Text style={s.headerMeta}>By: {data.generatedBy}</Text>
              <Text style={s.headerMeta}>Project: {data.projectName}</Text>
            </View>
          </View>

          <Text style={s.reportTitle}>{data.title}</Text>
          <Text style={s.reportSubtitle}>
            Security Investigation Report  ·  {data.findings.length} findings  ·  {data.assets.length} assets
          </Text>
          <RiskBadge risk={data.ai.riskLevel} />
        </View>

        <View style={s.body}>
          {/* ── Executive Summary ── */}
          {inc("executiveSummary") && (
            <View style={s.section}>
              <SectionTitle>Executive Summary</SectionTitle>
              {data.ai.executiveSummary.split("\n").filter(Boolean).map((para, i) => (
                <Text key={i} style={s.paragraph}>{para.trim()}</Text>
              ))}
            </View>
          )}

          {/* ── Asset Inventory ── */}
          {inc("assetInventory") && (
            <View style={s.section}>
              <SectionTitle>Asset Inventory</SectionTitle>
              <Text style={[s.paragraph, { marginBottom: 8 }]}>{data.ai.assetSummary}</Text>

              {data.assets.length > 0 && (
                <View style={s.table}>
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, { width: 90 }]}>IP Address</Text>
                    <Text style={[s.tableHeaderCell, { width: 110 }]}>Hostname</Text>
                    <Text style={[s.tableHeaderCell, { width: 70 }]}>Type</Text>
                    <Text style={[s.tableHeaderCell, { width: 100 }]}>Tags</Text>
                    <Text style={[s.tableHeaderCell, { width: 40 }]}>Findings</Text>
                  </View>
                  {data.assets.map((a, i) => (
                    <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                      <Text style={[s.tableCellMono, { width: 90 }]}>{a.ip ?? "—"}</Text>
                      <Text style={[s.tableCell,     { width: 110 }]}>{a.hostname ?? "—"}</Text>
                      <Text style={[s.tableCell,     { width: 70 }]}>{a.type}</Text>
                      <Text style={[s.tableCellMuted,{ width: 100 }]}>{a.tags.slice(0, 3).join(", ") || "—"}</Text>
                      <Text style={[s.tableCell,     { width: 40 }]}>{a.findingCount}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Findings by Severity ── */}
          {inc("findingsBySeverity") && (
            <View style={s.section}>
              <SectionTitle>Findings by Severity</SectionTitle>
              {data.ai.keyFindings.map((f, i) => (
                <View key={i} style={s.findingCard}>
                  <View style={s.findingHeader}>
                    <SevBadge severity={f.severity} />
                    <Text style={s.findingTitle}>{f.title}</Text>
                  </View>
                  <Text style={s.findingDesc}>{f.description}</Text>
                  {f.recommendation ? (
                    <Text style={s.findingRec}>
                      Recommendation: {f.recommendation}
                    </Text>
                  ) : null}
                </View>
              ))}

              {/* Raw findings table */}
              {data.findings.length > 0 && (
                <View style={[s.table, { marginTop: 8 }]}>
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, { width: 62 }]}>Severity</Text>
                    <Text style={[s.tableHeaderCell, { width: 100 }]}>Type</Text>
                    <Text style={[s.tableHeaderCell, { width: 90 }]}>Asset</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1 }]}>Description</Text>
                  </View>
                  {data.findings.map((f, i) => (
                    <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                      <View style={{ width: 62 }}>
                        <SevBadge severity={f.severity} />
                      </View>
                      <Text style={[s.tableCell,     { width: 100 }]}>{f.type}</Text>
                      <Text style={[s.tableCellMono, { width: 90 }]}>{f.assetLabel}</Text>
                      <Text style={[s.tableCellMuted,{ flex: 1 }]}>{f.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Recommendations ── */}
          {inc("recommendations") && (
            <View style={s.section}>
              <SectionTitle>Recommendations</SectionTitle>
              {data.ai.recommendations.map((r, i) => (
                <View key={i} style={s.recCard}>
                  <PriLabel priority={r.priority} />
                  <View style={s.recContent}>
                    <Text style={s.recTitle}>{r.title}</Text>
                    <Text style={s.recDesc}>{r.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Timeline ── */}
          {inc("timeline") && data.timeline.length > 0 && (
            <View style={s.section}>
              <SectionTitle>Investigation Timeline</SectionTitle>
              {data.timeline.slice(0, 40).map((e, i) => (
                <View key={i} style={s.timelineRow}>
                  <View style={s.timelineDot} />
                  <Text style={s.timelineAction}>{e.action}</Text>
                  <Text style={s.timelineMeta}>
                    {e.userName ?? "System"}{"\n"}{fmtDate(e.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>NetFusion Security Platform  ·  Confidential</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
