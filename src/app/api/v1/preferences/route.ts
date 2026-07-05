import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { resolveDbClient, sessionUser } from "@/lib/auth/api-session";

export const dynamic = "force-dynamic";

const DEFAULT = {
  version: 1,
  followedCountries: [] as string[],
  pinnedWebcams: [] as string[],
  cyberWatchlist: [] as string[],
  locale: "en",
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  const user = await sessionUser();
  if (!user) {
    return noCacheJson({ preferences: null, note: "Sign in to sync preferences" });
  }

  const principal = { id: user.id, role: "user" as const, email: user.email };
  const db = await resolveDbClient(principal);
  if (!db) return noCacheJson({ preferences: null, note: "Database unavailable" });

  const { data } = await db
    .from("user_preferences")
    .select("prefs_json")
    .eq("user_id", user.id)
    .maybeSingle();

  return noCacheJson({
    preferences: data?.prefs_json ?? DEFAULT,
    syncedAt: new Date().toISOString(),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  if (auth.role !== "user" && auth.role !== "admin") {
    return noCacheJson({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return noCacheJson({ error: "invalid body" }, { status: 400 });
  }

  const db = await resolveDbClient(auth);
  if (!db) return noCacheJson({ error: "database unavailable" }, { status: 503 });

  const prefs = { ...DEFAULT, ...body, version: 1, updatedAt: new Date().toISOString() };
  const userId = auth.role === "user" ? auth.id : String(body.userId ?? auth.id);
  const { error } = await db.from("user_preferences").upsert({
    user_id: userId,
    prefs_json: prefs,
    updated_at: new Date().toISOString(),
  });

  if (error) return noCacheJson({ error: error.message }, { status: 500 });
  return noCacheJson({ ok: true, preferences: prefs });
}
