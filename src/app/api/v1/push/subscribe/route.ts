import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { resolveDbClient } from "@/lib/auth/api-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  if (auth.role !== "user") {
    return noCacheJson({ error: "Sign in required for push subscriptions" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return noCacheJson({ error: "invalid subscription" }, { status: 400 });
  }

  const db = await resolveDbClient(auth);
  if (!db) return noCacheJson({ error: "database unavailable" }, { status: 503 });

  const { error } = await db.from("push_subscriptions").upsert({
    user_id: auth.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
  }, { onConflict: "endpoint" });

  if (error) return noCacheJson({ error: error.message }, { status: 500 });
  return noCacheJson({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return noCacheJson({ error: "endpoint required" }, { status: 400 });

  const db = await resolveDbClient(auth);
  if (!db) return noCacheJson({ error: "database unavailable" }, { status: 503 });

  await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return noCacheJson({ ok: true });
}
