import nodemailer from "nodemailer";

// ── Transport ──────────────────────────────────────────────────────────────────
// Configure via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// Falls back to a no-op logger when SMTP_HOST is not set (dev without email).

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.SMTP_FROM ?? "NetFusion <noreply@netfusion.local>";

// ── Send invite email ──────────────────────────────────────────────────────────

export async function sendInviteEmail(opts: {
  to: string;
  projectName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}) {
  const transport = getTransport();

  const subject = `You've been invited to "${opts.projectName}" on NetFusion`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;">
    <div style="margin-bottom:24px;">
      <span style="display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:18px;color:#e6edf3;">
        NetFusion
      </span>
    </div>
    <h1 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#e6edf3;">
      You've been invited
    </h1>
    <p style="color:#8b949e;margin:0 0 24px;font-size:14px;line-height:1.5;">
      <strong style="color:#e6edf3;">${opts.inviterName}</strong> has invited you to join
      <strong style="color:#e6edf3;">${opts.projectName}</strong> as a
      <strong style="color:#00b4d8;">${opts.role}</strong>.
    </p>
    <a href="${opts.inviteUrl}"
       style="display:inline-block;background:#00b4d8;color:#0d1117;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">
      Accept Invitation
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#8b949e;">
      This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:#8b949e;word-break:break-all;">
      Or copy this link: ${opts.inviteUrl}
    </p>
  </div>
</body>
</html>`;

  if (!transport) {
    // Dev mode — print to console instead of sending
    console.log("\n─── INVITE EMAIL (SMTP not configured) ───────────────────");
    console.log(`To:      ${opts.to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${opts.inviteUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
    return;
  }

  await transport.sendMail({
    from: FROM,
    to: opts.to,
    subject,
    html,
  });
}
