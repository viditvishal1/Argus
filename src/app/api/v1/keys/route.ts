import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/auth/api-keys";
import { sessionUser } from "@/lib/auth/api-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await sessionUser();
  if (!user) return noCacheJson({ keys: [], note: "Sign in to manage API keys" });
  const keys = await listApiKeys(user.id);
  return noCacheJson({ keys });
}

export async function POST(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  if (auth.role !== "user" && auth.role !== "admin") {
    return noCacheJson({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "default").slice(0, 64);
  const created = await createApiKey(auth.id, name);
  if (!created) return noCacheJson({ error: "database unavailable" }, { status: 503 });

  return noCacheJson({
    key: created.raw,
    record: created.record,
    note: "Store this key now — it will not be shown again.",
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return noCacheJson({ error: "id required" }, { status: 400 });
  const ok = await revokeApiKey(auth.id, id);
  return noCacheJson({ ok });
}
