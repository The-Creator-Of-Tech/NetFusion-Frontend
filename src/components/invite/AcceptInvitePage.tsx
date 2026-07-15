"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface InviteInfo {
  email: string;
  role: string;
  projectName: string;
  projectId: string;
}

interface Props {
  token: string;
}

export default function AcceptInvitePage({ token }: Props) {
  const router = useRouter();

  const [info,     setInfo]     = useState<InviteInfo | null>(null);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [needsReg, setNeedsReg] = useState(false); // true = new user, needs name+password
  const [name,     setName]     = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState("");

  // Load invite info
  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Invalid invitation"); return; }
        setInfo(data);

        // Check if user already has an account with this email
        // We do this by trying to sign in — simpler to just ask the server
        // Actually: if GET succeeded without needing a password, the email
        // may or may not exist. We determine this on submit.
        setNeedsReg(false); // optimistic — server will tell us if reg needed
      })
      .catch(() => setError("Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setFormError("");
    setSubmitting(true);

    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, password: password || undefined }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      // If the server says name+password are required, show registration fields
      if (res.status === 400 && data.error?.includes("password")) {
        setNeedsReg(true);
        setFormError(data.error);
      } else {
        setFormError(data.error ?? "Something went wrong");
      }
      return;
    }

    // Success — redirect to login with a message, then to project
    router.push(`/login?invited=1&next=/dashboard/projects/${data.projectId}`);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Invalid / expired ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-danger-dim border border-danger/20 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="text-danger">
              <path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">Invitation Invalid</h1>
          <p className="text-muted text-sm mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-accent text-background px-5 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Accept form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="#0d1117" />
              <circle cx="10" cy="10" r="7" stroke="#0d1117" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="3" x2="10" y2="0" stroke="#0d1117" strokeWidth="1.5" />
              <line x1="10" y1="17" x2="10" y2="20" stroke="#0d1117" strokeWidth="1.5" />
              <line x1="3" y1="10" x2="0" y2="10" stroke="#0d1117" strokeWidth="1.5" />
              <line x1="17" y1="10" x2="20" y2="10" stroke="#0d1117" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="font-bold text-lg text-foreground">NetFusion</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          {/* Invite summary */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" className="text-accent">
                <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-foreground">You&apos;ve been invited</h1>
            <p className="text-muted text-sm mt-1.5">
              Join{" "}
              <span className="text-foreground font-semibold">{info?.projectName}</span>
              {" "}as a{" "}
              <span className="text-accent font-semibold">{info?.role}</span>
            </p>
            <p className="text-xs text-muted mt-1">{info?.email}</p>
          </div>

          {/* Registration fields (new user only) */}
          {needsReg && (
            <div className="space-y-3 mb-4">
              <p className="text-xs text-muted bg-surface-2 border border-border rounded-lg px-3 py-2.5">
                No account found for this email — create one to accept the invitation.
              </p>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Your name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoFocus
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Password <span className="text-danger">*</span>
                  <span className="text-muted font-normal ml-1">(min. 8 characters)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
            </div>
          )}

          {formError && (
            <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2.5 mb-4">
              {formError}
            </p>
          )}

          <button
            onClick={handleAccept}
            disabled={submitting}
            className="w-full bg-accent text-background py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? "Accepting…" : needsReg ? "Create Account & Join" : "Accept Invitation"}
          </button>

          <p className="text-center text-xs text-muted mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
