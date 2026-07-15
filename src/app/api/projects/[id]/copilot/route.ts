import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { track } from "@/lib/analytics";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// POST /api/projects/[id]/copilot
// Body: { messages: {role, content}[] }
// Returns: text/event-stream (SSE) with streamed Groq response
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });

  // Rate limiting
  const rateLimitResult = checkRateLimit(session.user.id);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 20 Copilot requests per hour.", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString() },
      }
    );
  }

  await track("copilot_message_sent", { userId: session.user.id, projectId: params.id });

  try {
    const body = await req.json();
    const { messages } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages?.length)
      return NextResponse.json({ error: "messages is required", code: "VALIDATION_ERROR" }, { status: 400 });

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content;
    if (!lastUserMessage)
      return NextResponse.json({ error: "No user question found", code: "VALIDATION_ERROR" }, { status: 400 });

    console.log("COPILOT QUESTION", lastUserMessage);
    console.log("FORWARDING TO AI DETECTIVE");

    const detectiveRes = await fetch("http://localhost:8000/ai/detective", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: params.id, question: lastUserMessage }),
    });

    const responseText = await detectiveRes.text();
    let loggedResponse: unknown = responseText;
    try {
      loggedResponse = JSON.parse(responseText);
    } catch {
      // keep raw text if not JSON
    }
    console.log("DETECTIVE RESPONSE", loggedResponse);

    return new Response(responseText, {
      status: detectiveRes.status,
      headers: {
        "Content-Type": detectiveRes.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Copilot error:", error);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
