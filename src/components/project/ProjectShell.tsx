import { signOut } from "@/lib/auth";
import Link from "next/link";
import ProjectSidebar from "./ProjectSidebar";
import ProjectTopBar from "./ProjectTopBar";
import CopilotWrapper from "@/components/copilot/CopilotWrapper";
import { NetfusionContextProvider } from "@/components/copilot/NetfusionContextProvider";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Props {
  project: { id: string; name: string; description: string | null };
  members: Member[];
  currentUser: { id: string; name: string; role: string; projectRole: string };
  stats: {
    riskScore: number;
    riskLevel: string;
    assetsCount: number;
    findingsCount: number;
    criticalFindingsCount: number;
    alertsCount: number;
    lastActivity: string;
  };
  children: React.ReactNode;
}

const globalRoleColors: Record<string, string> = {
  OWNER: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  ANALYST: "text-accent bg-accent-dim border-accent/20",
  VIEWER: "text-muted bg-surface-2 border-border",
};

export default function ProjectShell({ project, members, currentUser, stats, children }: Props) {
  const roleClass = globalRoleColors[currentUser.role] ?? globalRoleColors.ANALYST;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Global top nav */}
      <header className="bg-surface border-b border-border px-5 py-2.5 flex items-center justify-between shrink-0 z-20">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="#0d1117" />
              <circle cx="10" cy="10" r="7" stroke="#0d1117" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="3" x2="10" y2="0" stroke="#0d1117" strokeWidth="1.5" />
              <line x1="10" y1="17" x2="10" y2="20" stroke="#0d1117" strokeWidth="1.5" />
              <line x1="3" y1="10" x2="0" y2="10" stroke="#0d1117" strokeWidth="1.5" />
              <line x1="17" y1="10" x2="20" y2="10" stroke="#0d1117" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="font-bold text-sm text-foreground">NetFusion</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted hidden sm:block">{currentUser.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${roleClass}`}>
            {currentUser.role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs text-muted hover:text-danger transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Project top bar (breadcrumb + members + share) */}
      <ProjectTopBar
        projectId={project.id}
        projectName={project.name}
        members={members}
        currentUserId={currentUser.id}
        stats={stats}
      />

      {/* Body: sidebar + content + copilot */}
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar projectId={project.id} />

        <NetfusionContextProvider>
          {/* CopilotWrapper reads from NetfusionContextProvider */}
          <CopilotWrapper projectId={project.id}>
            <main className="flex-1 overflow-y-auto bg-background">
              {children}
            </main>
          </CopilotWrapper>
        </NetfusionContextProvider>
      </div>
    </div>
  );
}
