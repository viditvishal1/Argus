"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAuthConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const configured = supabaseAuthConfigured();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(next);
      })
      .catch(() => {});
  }, [next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        setMessage("Check your email to confirm, or sign in if confirmation is disabled.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-12">
      <div>
        <h1 className="text-lg font-semibold text-ink">Sign in to Argus</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Investigations, watchlists, and alert rules are scoped to your account when Supabase Auth is enabled.
        </p>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Supabase Auth is not configured. Set{" "}
          <code className="mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment.
          Private APIs still accept <code className="mono text-xs">ARGUS_API_SECRET</code> in production.
        </div>
      )}

      {authError && (
        <div className="rounded-lg border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-critical">
          Authentication callback failed. Try again.
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink"
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>
        <button
          type="submit"
          disabled={!configured || busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-body disabled:opacity-50"
        >
          {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      {message && <p className="text-sm text-ink-dim">{message}</p>}

      <p className="text-xs text-ink-dim">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button type="button" className="text-accent hover:underline" onClick={() => setMode("signup")}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" className="text-accent hover:underline" onClick={() => setMode("signin")}>
              Sign in
            </button>
          </>
        )}
        {" · "}
        <Link href="/" className="text-accent hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
