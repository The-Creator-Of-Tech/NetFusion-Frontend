"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MemberUser {
  id: string;
  name: string;
  email: string;
}

export interface MemberRow {
  id: string;
  role: string;
  joinedAt: string;
  user: MemberUser;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

interface Props {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  initialMembers: MemberRow[];
  initialInvites: PendingInvite[];
  currentUserId: string;
  isOwner: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  OWNER:   "Owner",
  ANALYST: "Analyst",
  VIEWER:  "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  ANALYST: "text-accent bg-accent/10 border-accent/20",
  VIEWER:  "text-muted bg-surface-2 border-border",
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function avatarHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Invite Modal ───────────────────────────────────────────────────────────────

interface InviteModalProps {
  projectId: string;
  onInvited: (result: { member?: MemberRow; invite?: PendingInvite }) => void;
  onClose: () => void;
}

function InviteModal({ projectId, onInvited, onClose }: InviteModalProps) {
  const [email,   setEmail]   = useState("");
  const [role,    setRole]    = useState("ANALYST");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    setError("");
    setLoading(true);

    const res  = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Failed to send invite"); return; }
    onInvited(data);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Invite Member</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground p-1 rounded transition-colors">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Email address <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(["ANALYST", "VIEWER"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left ${
                    role === r
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "bg-surface-2 border-border text-muted hover:text-foreground hover:border-accent/20"
                  }`}
                >
                  <p className="font-semibold">{ROLE_LABELS[r]}</p>
                  <p className="text-xs font-normal mt-0.5 opacity-70">
                    {r === "ANALYST" ? "Can add & edit data" : "Read-only access"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-muted py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent text-background py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending…" : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SettingsClient({
  projectId,
  projectName,
  projectDescription,
  initialMembers,
  initialInvites,
  currentUserId,
  isOwner,
}: Props) {
  const [members,       setMembers]       = useState<MemberRow[]>(initialMembers);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialInvites);
  const [inviteOpen,    setInviteOpen]    = useState(false);
  const [toast,         setToast]         = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null); // memberId
  const [roleLoading,   setRoleLoading]   = useState<string | null>(null); // memberId

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ── Invite result ────────────────────────────────────────────────────────────
  function handleInvited(result: { member?: MemberRow; invite?: PendingInvite; invited?: boolean }) {
    setInviteOpen(false);
    if (result.member) {
      setMembers((prev) => [...prev, result.member!]);
      showToast(`${result.member.user.name} added to project`);
    } else if (result.invite) {
      setPendingInvites((prev) => [result.invite!, ...prev]);
      showToast(`Invitation sent to ${result.invite.email}`);
    }
  }

  // ── Role change ──────────────────────────────────────────────────────────────
  async function handleRoleChange(memberId: string, newRole: string) {
    setRoleLoading(memberId);
    const res  = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    setRoleLoading(null);
    if (!res.ok) { showToast("Failed to change role"); return; }
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: data.member.role } : m));
    showToast("Role updated");
  }

  // ── Remove member ────────────────────────────────────────────────────────────
  async function handleRemove(memberId: string) {
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
    setConfirmRemove(null);
    if (!res.ok) { showToast("Failed to remove member"); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    showToast("Member removed");
  }

  // ── Revoke invite ────────────────────────────────────────────────────────────
  async function handleRevokeInvite(inviteId: string) {
    const res = await fetch(`/api/projects/${projectId}/members/invites/${inviteId}`, { method: "DELETE" });
    if (!res.ok) { showToast("Failed to revoke invite"); return; }
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    showToast("Invitation revoked");
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
        <p className="text-muted text-xs mt-0.5">Project configuration and member management</p>
      </div>

      {/* Project info (read-only for now) */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Project</h2>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs text-muted mb-1">Name</p>
            <p className="text-sm text-foreground font-medium">{projectName}</p>
          </div>
          {projectDescription && (
            <div>
              <p className="text-xs text-muted mb-1">Description</p>
              <p className="text-sm text-foreground">{projectDescription}</p>
            </div>
          )}
        </div>
      </section>

      {/* Members */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Members
            <span className="ml-2 text-xs text-muted font-normal">{members.length}</span>
          </h2>
          {isOwner && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 bg-accent text-background px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
              </svg>
              Invite Member
            </button>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {members.map((m, i) => {
            const isYou      = m.user.id === currentUserId;
            const isThisOwner = m.role === "OWNER";
            const hue        = avatarHue(m.user.name);
            const canChange  = isOwner && !isThisOwner && !isYou;

            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < members.length - 1 ? "border-b border-border" : ""}`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: `hsl(${hue},50%,38%)` }}
                >
                  {getInitials(m.user.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{m.user.name}</span>
                    {isYou && <span className="text-xs text-muted">(you)</span>}
                  </div>
                  <p className="text-xs text-muted truncate">{m.user.email}</p>
                </div>

                {/* Role badge / selector */}
                <div className="shrink-0">
                  {canChange ? (
                    <select
                      value={m.role}
                      disabled={roleLoading === m.id}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <option value="ANALYST">Analyst</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${ROLE_COLORS[m.role] ?? ROLE_COLORS.VIEWER}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  )}
                </div>

                {/* Joined date */}
                <span className="text-xs text-muted shrink-0 hidden sm:block">
                  {formatDate(m.joinedAt)}
                </span>

                {/* Remove button */}
                {canChange && (
                  <div className="shrink-0">
                    {confirmRemove === m.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted">Remove?</span>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-xs text-muted hover:text-foreground transition-colors"
                        >No</button>
                        <button
                          onClick={() => handleRemove(m.id)}
                          className="text-xs text-danger font-semibold hover:opacity-80 transition-opacity"
                        >Yes</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(m.id)}
                        className="text-muted hover:text-danger transition-colors p-1 rounded"
                        title="Remove member"
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pending invitations */}
      {isOwner && pendingInvites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Pending Invitations
            <span className="ml-2 text-xs text-muted font-normal">{pendingInvites.length}</span>
          </h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {pendingInvites.map((inv, i) => (
              <div
                key={inv.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < pendingInvites.length - 1 ? "border-b border-border" : ""}`}
              >
                {/* Envelope icon */}
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0 text-muted">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 5.04v7.21c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.04l-5.56 3.683a1.75 1.75 0 0 1-1.88 0ZM14.5 3.5h-13l5.985 3.962a.25.25 0 0 0 .268 0Z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                  <p className="text-xs text-muted">
                    Expires {formatDate(inv.expiresAt)}
                  </p>
                </div>

                <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${ROLE_COLORS[inv.role] ?? ROLE_COLORS.VIEWER}`}>
                  {ROLE_LABELS[inv.role] ?? inv.role}
                </span>

                <button
                  onClick={() => handleRevokeInvite(inv.id)}
                  className="text-muted hover:text-danger transition-colors p-1 rounded shrink-0"
                  title="Revoke invitation"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <InviteModal
          projectId={projectId}
          onInvited={handleInvited}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
