// Lightweight analytics. Logs to console always.
// Sends to PostHog if POSTHOG_KEY is set (server-side only via fetch).

type EventName =
  | "project_created"
  | "report_generated"
  | "copilot_message_sent"
  | "member_invited"
  | "finding_created"
  | "asset_created";

interface EventProps {
  userId: string;
  projectId?: string;
  [key: string]: string | number | boolean | undefined;
}

export async function track(event: EventName, props: EventProps) {
  // Always log to console (structured)
  console.log(`[analytics] ${event}`, { userId: props.userId, projectId: props.projectId });

  // PostHog (optional)
  const posthogKey = process.env.POSTHOG_KEY;
  const posthogHost = process.env.POSTHOG_HOST ?? "https://app.posthog.com";
  if (!posthogKey) return;

  try {
    await fetch(`${posthogHost}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        distinct_id: props.userId,
        properties: {
          projectId: props.projectId,
          $lib: "netfusion-server",
        },
      }),
    });
  } catch {
    // Non-blocking — analytics failures should never crash the app
  }
}
