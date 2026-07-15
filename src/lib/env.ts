// Called at startup from the root layout (server-side).
// Throws with a clear message if required vars are missing.

const REQUIRED = [
  { key: "DATABASE_URL",    desc: "MySQL connection string" },
  { key: "NEXTAUTH_SECRET", desc: "NextAuth signing secret" },
];

const OPTIONAL = [
  { key: "GROQ_API_KEY", desc: "Groq AI features (Copilot, Reports)" },
];

export function validateEnv() {
  const missing: string[] = [];
  for (const { key, desc } of REQUIRED) {
    if (!process.env[key]) missing.push(`  • ${key} — ${desc}`);
  }
  if (missing.length > 0) {
    throw new Error(
      `\n\n❌ NetFusion: Missing required environment variables:\n${missing.join("\n")}\n\nCheck your .env file.\n`
    );
  }
  for (const { key, desc } of OPTIONAL) {
    if (!process.env[key]) {
      console.warn(`[NetFusion] Optional env var not set: ${key} (${desc})`);
    }
  }
}
