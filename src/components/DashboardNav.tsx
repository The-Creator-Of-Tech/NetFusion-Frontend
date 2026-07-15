import { signOut } from "@/lib/auth";
import Link from "next/link";

interface DashboardNavProps {
  userName?: string | null;
  userRole?: string;
}

const roleColors: Record<string, string> = {
  OWNER: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  ANALYST: "text-accent bg-accent-dim border-accent/20",
  VIEWER: "text-muted bg-surface-2 border-border",
};

export default function DashboardNav({ userName, userRole }: DashboardNavProps) {
  const role = userRole ?? "ANALYST";
  const roleClass = roleColors[role] ?? roleColors.ANALYST;

  return (
    <header className="bg-surface border-b border-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
      <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" fill="#0d1117" />
            <circle cx="10" cy="10" r="7" stroke="#0d1117" strokeWidth="1.5" fill="none" />
            <line x1="10" y1="3" x2="10" y2="0" stroke="#0d1117" strokeWidth="1.5" />
            <line x1="10" y1="17" x2="10" y2="20" stroke="#0d1117" strokeWidth="1.5" />
            <line x1="3" y1="10" x2="0" y2="10" stroke="#0d1117" strokeWidth="1.5" />
            <line x1="17" y1="10" x2="20" y2="10" stroke="#0d1117" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="font-bold text-foreground">NetFusion</span>
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted hidden sm:block">{userName}</span>
          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${roleClass}`}>
            {role}
          </span>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-muted hover:text-danger transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
