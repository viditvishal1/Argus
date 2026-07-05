"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { supabaseAuthConfigured } from "@/lib/supabase/env";

interface SessionUser {
  id: string;
  email?: string;
}

export function AuthButton() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = supabaseAuthConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [configured]);

  if (!configured) return null;

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      window.location.href = "/";
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return <span className="hidden px-2 text-[10px] text-ink-dim lg:inline">…</span>;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink-dim hover:bg-panel hover:text-ink"
      >
        <LogIn className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">Sign in</span>
      </Link>
    );
  }

  const label = user.email?.split("@")[0] ?? "Account";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink-dim">
        <User className="h-4 w-4 shrink-0" />
        <span className="hidden truncate lg:inline" title={user.email}>
          {label}
        </span>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink-dim hover:bg-panel hover:text-ink"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">Sign out</span>
      </button>
    </div>
  );
}
