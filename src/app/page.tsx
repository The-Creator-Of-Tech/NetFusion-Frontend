import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground text-center px-4">
      {/* Logo mark */}
      <div className="mb-6 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" fill="#0d1117" />
            <circle cx="10" cy="10" r="7" stroke="#0d1117" strokeWidth="1.5" fill="none" />
            <line x1="10" y1="3" x2="10" y2="0" stroke="#0d1117" strokeWidth="1.5" />
            <line x1="10" y1="17" x2="10" y2="20" stroke="#0d1117" strokeWidth="1.5" />
            <line x1="3" y1="10" x2="0" y2="10" stroke="#0d1117" strokeWidth="1.5" />
            <line x1="17" y1="10" x2="20" y2="10" stroke="#0d1117" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight">NetFusion</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
        Unified Network<br />
        <span className="text-accent">Analysis Workspace</span>
      </h1>

      <p className="text-muted mb-10 max-w-md text-base leading-relaxed">
        Discovery, traffic analysis, investigation management, reporting,
        and team collaboration — all in one place.
      </p>

      <div className="flex gap-3">
        <Link
          href="/login"
          className="bg-accent text-background px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-accent-hover transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="border border-border text-foreground px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-surface-2 transition-colors"
        >
          Register
        </Link>
      </div>

      {/* Quote */}
      <div className="mt-20 flex flex-col items-center gap-4">
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-accent/50" />
        <p className="text-lg sm:text-xl font-medium text-foreground max-w-sm leading-snug">
          &ldquo;Experts do not need more tools.{" "}
          <span className="text-accent font-semibold">
            They need fewer tabs.
          </span>
          &rdquo;
        </p>
        <p className="text-xs text-muted tracking-widest uppercase">
          Core Philosophy
        </p>
      </div>
    </div>
  );
}
