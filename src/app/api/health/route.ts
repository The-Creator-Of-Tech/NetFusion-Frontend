import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const health: Record<string, "healthy" | "unhealthy" | "unknown"> = {
    database: "unhealthy",
    backend: "healthy",
    captureAgent: "unhealthy",
    aiProviders: "unhealthy",
    repositoryServer: "unhealthy",
  };

  // 1. Database & Repository Server Checks
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = "healthy";
    health.repositoryServer = "healthy";
  } catch (error) {
    console.error("Database health check failed:", error);
  }

  // 2. Capture Agent Check
  try {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8001";
    const res = await fetch(agentUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      health.captureAgent = "healthy";
    }
  } catch (error) {
    console.error("Capture Agent health check failed:", error);
  }

  // 3. AI Providers Check
  if (process.env.GROQ_API_KEY) {
    health.aiProviders = "healthy";
  }

  return NextResponse.json(health);
}
