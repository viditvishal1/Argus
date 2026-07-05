import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/env";

export interface ApiPrincipal {
  id: string;
  role: "anonymous" | "user" | "admin" | "service";
  email?: string;
}

function readBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

function secretsMatch(got: string, expected: string): boolean {
  try {
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function resolveSecrets(): string[] {
  return [
    process.env.ARGUS_API_SECRET,
    process.env.ARGUS_ADMIN_SECRET,
    process.env.EARTHOS_ADMIN_SECRET,
  ].filter((s): s is string => Boolean(s?.trim()));
}

export function hasApiSecrets(): boolean {
  return resolveSecrets().length > 0;
}

/** Bearer admin secret check (sync). */
export function resolveBearerPrincipal(req: NextRequest): ApiPrincipal | null {
  const token = readBearer(req);
  const secrets = resolveSecrets();
  if (token && secrets.some((s) => secretsMatch(token, s))) {
    return { id: "admin", role: "admin" };
  }
  return null;
}

/**
 * Private API auth — Supabase session cookie, bearer admin secret, or dev passthrough.
 */
export async function requirePrivateApi(req: NextRequest): Promise<ApiPrincipal | NextResponse> {
  const bearer = resolveBearerPrincipal(req);
  if (bearer) return bearer;

  const token = readBearer(req);
  if (token?.startsWith("argus_")) {
    const { verifyUserApiKey } = await import("@/lib/auth/api-keys");
    const userKey = await verifyUserApiKey(token);
    if (userKey) return userKey;
  }

  if (supabaseAuthConfigured()) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) {
        return { id: user.id, role: "user", email: user.email ?? undefined };
      }
    } catch {
      // fall through to secret / dev checks
    }
  }

  const secrets = resolveSecrets();
  if (secrets.length > 0) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in or provide a Bearer token for this endpoint" },
      { status: 401 },
    );
  }

  if (process.env.NODE_ENV !== "production") {
    return { id: "dev-anonymous", role: "anonymous" };
  }

  if (supabaseAuthConfigured()) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in required" },
      { status: 401 },
    );
  }

  return { id: "anonymous", role: "anonymous" };
}

export function isPrincipalError(v: ApiPrincipal | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}

/** @deprecated Use requirePrivateApi — kept for imports that only need bearer. */
export function resolveApiPrincipal(req: NextRequest): ApiPrincipal {
  const bearer = resolveBearerPrincipal(req);
  if (bearer) return bearer;
  const secrets = resolveSecrets();
  if (secrets.length === 0 && process.env.NODE_ENV !== "production") {
    return { id: "dev-anonymous", role: "anonymous" };
  }
  return { id: "anonymous", role: "anonymous" };
}
