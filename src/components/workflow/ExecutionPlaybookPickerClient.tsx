"use client";

import { useRouter } from "next/navigation";
import { usePlaybooks } from "@/hooks/usePlaybooks";

interface Props { projectId: string }

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:   { bg: "bg-green-500/10", text: "text-green-400" },
  inactive: { bg: "bg-surface-2",    text: "text-muted" },
  archived: { bg: "bg-yellow-500/10",text: "text-yellow-400" },
  draft:    { bg: "bg-blue-500/10",  text: "text-blue-400" },
};

/**
 * Landing page for /workflow/executions.
 *
 * The backend scopes executions per-playbook. This page lists all playbooks
 * and navigates to /workflow/executions/[playbookId] when one is selected,
 * putting the playbookId in the URL so it survives refreshes.
 */
export default function ExecutionPlaybookPickerClient({ projectId }: Props) {
  const router = useRouter();
  const { playbooks, loading, error, refresh } = usePlaybooks(projectId);

  if (loading) return (
    <div className="p-6">
      <div className="h-7 w-56 bg-surface-2 rounded animate-pulse mb-5" />
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0 animate-pulse">
            <div className="h-4 w-40 bg-surface-2 rounded" />
            <div className="h-4 w-20 bg-surface-2 rounded" />
            <div className="h-4 w-16 bg-surface-2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
      <p className="text-red-400 text-sm mb-3">{error}</p>
      <button onClick={refresh} className="text-xs text-accent hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-foreground">Execution Monitor</h1>
        <p className="text-muted text-xs mt-0.5">
          Select a playbook to view its execution history.
        </p>
      </div>

      {playbooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-2xl">📋</div>
          <p className="text-foreground font-medium mb-1">No Playbooks Yet</p>
          <p className="text-muted text-sm max-w-xs">
            Create a playbook first, then come back here to monitor its executions.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Playbook</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Triggered</th>
              </tr>
            </thead>
            <tbody>
              {playbooks.map(p => {
                const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
                return (
                  <tr
                    key={p.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/projects/${projectId}/workflow/executions/${p.id}`
                      )
                    }
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-surface-2/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-foreground">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-muted truncate max-w-xs mt-0.5">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted capitalize">
                      {p.category?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-muted">
                      {p.triggerCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
