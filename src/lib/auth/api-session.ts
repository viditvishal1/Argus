import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbEnabled } from "@/lib/db";
import type { ApiPrincipal } from "@/lib/auth/api-guard";
import { createClient as createUserSupabase } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/env";

async function serviceClient(): Promise<SupabaseClient | null> {
  if (!dbEnabled() || !process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

/** User-scoped client (RLS) for signed-in users; service role for admin/dev. */
export async function resolveDbClient(principal: ApiPrincipal): Promise<SupabaseClient | null> {
  if (principal.role === "user" && supabaseAuthConfigured()) {
    return createUserSupabase();
  }
  if (principal.role === "admin" || principal.role === "anonymous") {
    return serviceClient();
  }
  return serviceClient();
}

export function ownerIdForInsert(principal: ApiPrincipal): string | null {
  if (principal.role === "user") return principal.id;
  return null;
}

export async function sessionUser(): Promise<{ id: string; email?: string } | null> {
  if (!supabaseAuthConfigured()) return null;
  try {
    const supabase = await createUserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? undefined };
  } catch {
    return null;
  }
}

export async function sessionResponse() {
  const user = await sessionUser();
  return NextResponse.json({ user, authConfigured: supabaseAuthConfigured() });
}
