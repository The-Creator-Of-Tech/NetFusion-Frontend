import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReportDocument, type ReportData, type AiContent } from "@/lib/pdf/reportTemplate";
import { track } from "@/lib/analytics";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// POST /api/projects/[id]/reports/generate
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const {
      title,
      sections = ["executiveSummary", "assetInventory", "findingsBySeverity", "recommendations", "timeline"],
      dateFrom,
      dateTo,
    } = body as {
      title: string;
      sections: string[];
      dateFrom?: string;
      dateTo?: string;
    };

    if (!title?.trim())
      return NextResponse.json({ error: "Title is required" }, { status: 400 });

    // ── Fetch all project data ─────────────────────────────────────────────────
    const dateFilter = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
    };
    const hasDateFilter = dateFrom || dateTo;

    const [project, assets, findings, note, timeline, user] = await Promise.all([
      prisma.project.findUnique({
        where: { id: params.id },
        select: { name: true, description: true },
      }),
      prisma.asset.findMany({
        where: { projectId: params.id },
        include: { _count: { select: { findings: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.finding.findMany({
        where: {
          projectId: params.id,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        include: { asset: { select: { ip: true, hostname: true, type: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.note.findFirst({
        where: { projectId: params.id },
        select: { content: true },
      }),
      prisma.timelineEntry.findMany({
        where: {
          projectId: params.id,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      }),
    ]);

    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // ── Build AI prompt ────────────────────────────────────────────────────────
    const severityCounts = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].reduce(
      (acc, s) => ({ ...acc, [s]: findings.filter((f) => f.severity === s).length }),
      {} as Record<string, number>
    );

    const promptData = {
      projectName: project.name,
      description: project.description ?? "No description",
      assetCount: assets.length,
      assetTypes: Array.from(new Set(assets.map((a) => a.type))).join(", "),
      findings: findings.slice(0, 30).map((f) => ({
        type: f.type,
        severity: f.severity,
        description: f.description.slice(0, 200),
        asset: f.asset.ip ?? f.asset.hostname ?? f.asset.type,
      })),
      severityCounts,
      noteSnippet: note ? stripHtml(note.content).slice(0, 500) : "",
      timelineHighlights: timeline.slice(0, 15).map((e) => e.action),
    };

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const apiKey = process.env.GROQ_API_KEY;
    let aiContent: AiContent;

    if (!apiKey) {
      // Fallback: generate stub content when no API key is configured
      aiContent = buildStubContent(project.name, findings.length, assets.length, severityCounts);
    } else {
      const groq = new Groq({ apiKey });

      const completion = await groq.chat.completions.create({
        model:      "llama-3.3-70b-versatile",
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `You are a professional network security report writer. Given the following investigation data, generate a structured report. Return ONLY valid JSON with these fields:
- executiveSummary (string, 2-3 paragraphs separated by newlines)
- keyFindings (array of {severity: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"|"INFO", title, description, recommendation})
- assetSummary (string, 1 paragraph)
- recommendations (array of {priority: "HIGH"|"MEDIUM"|"LOW", title, description})
- riskLevel ("CRITICAL"|"HIGH"|"MEDIUM"|"LOW")
Do not include any text outside the JSON.`,
          },
          {
            role: "user",
            content: `Investigation data:\n${JSON.stringify(promptData, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";

      try {
        // Strip markdown code fences if the model wrapped the JSON
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        aiContent = JSON.parse(cleaned) as AiContent;
      } catch {
        console.error("Failed to parse Groq response:", raw);
        aiContent = buildStubContent(project.name, findings.length, assets.length, severityCounts);
      }
    }

    // ── Build report data ──────────────────────────────────────────────────────
    const now = new Date().toISOString();

    const reportData: ReportData = {
      title: title.trim(),
      projectName: project.name,
      generatedAt: now,
      generatedBy: user?.name ?? "Unknown",
      sections,
      assets: assets.map((a) => ({
        ip:           a.ip,
        hostname:     a.hostname,
        type:         a.type,
        tags:         Array.isArray(a.tags) ? (a.tags as string[]) : [],
        findingCount: a._count.findings,
      })),
      findings: findings.map((f) => ({
        type:        f.type,
        severity:    f.severity,
        description: f.description,
        assetLabel:  f.asset.ip ?? f.asset.hostname ?? f.asset.type,
      })),
      timeline: timeline.map((e) => ({
        action:    e.action,
        createdAt: e.createdAt.toISOString(),
        userName:  e.user?.name ?? null,
      })),
      noteText: note ? stripHtml(note.content).slice(0, 1000) : "",
      ai: aiContent,
    };

    // ── Render PDF ─────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(ReportDocument, { data: reportData }) as any
    );

    // ── Save report record ─────────────────────────────────────────────────────
    await prisma.report.create({
      data: {
        title: title.trim(),
        projectId: params.id,
        generatedById: session.user.id,
        sections,
        aiContent: aiContent as object,
        riskLevel: aiContent.riskLevel ?? "MEDIUM",
      },
    });

    await track("report_generated", { userId: session.user.id, projectId: params.id });

    // ── Return PDF ─────────────────────────────────────────────────────────────
    const filename = `${project.name.replace(/[^a-z0-9]/gi, "_")}_report_${Date.now()}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

// ── Stub content when no API key ───────────────────────────────────────────────

function buildStubContent(
  projectName: string,
  findingCount: number,
  assetCount: number,
  severityCounts: Record<string, number>
): AiContent {
  const critical = severityCounts.CRITICAL ?? 0;
  const high     = severityCounts.HIGH     ?? 0;
  const risk     = critical > 0 ? "CRITICAL" : high > 0 ? "HIGH" : findingCount > 0 ? "MEDIUM" : "LOW";

  return {
    executiveSummary: `This security investigation report summarizes the findings for project "${projectName}". The investigation identified ${findingCount} security finding${findingCount !== 1 ? "s" : ""} across ${assetCount} asset${assetCount !== 1 ? "s" : ""}.\n\nThe overall risk level has been assessed as ${risk} based on the severity distribution of identified vulnerabilities. Immediate attention is recommended for all critical and high severity findings.\n\nThis report provides a comprehensive overview of the current security posture, detailed findings, and actionable recommendations to improve the organization's security stance.`,
    keyFindings: findingCount === 0 ? [
      { severity: "INFO", title: "No findings recorded", description: "No security findings were recorded during this investigation period.", recommendation: "Continue regular security assessments." },
    ] : [
      ...(critical > 0 ? [{ severity: "CRITICAL", title: "Critical vulnerabilities detected", description: `${critical} critical severity finding${critical > 1 ? "s were" : " was"} identified requiring immediate remediation.`, recommendation: "Prioritize immediate patching and remediation of all critical findings." }] : []),
      ...(high > 0 ? [{ severity: "HIGH", title: "High-risk vulnerabilities present", description: `${high} high severity finding${high > 1 ? "s were" : " was"} identified.`, recommendation: "Schedule remediation within 72 hours." }] : []),
    ],
    assetSummary: `The investigation covered ${assetCount} networked asset${assetCount !== 1 ? "s" : ""}. Each asset was evaluated for vulnerabilities, misconfigurations, and exposure to known threat vectors.`,
    recommendations: [
      { priority: "HIGH",   title: "Address critical findings immediately", description: "Remediate all critical and high severity findings within 24-72 hours to reduce attack surface." },
      { priority: "MEDIUM", title: "Implement regular security assessments", description: "Schedule quarterly penetration tests and vulnerability assessments to maintain security posture." },
      { priority: "LOW",    title: "Review access controls",                description: "Audit user access permissions and enforce the principle of least privilege across all assets." },
    ],
    riskLevel: risk,
  };
}
