import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { deleteSavedSearch, listSavedSearches, upsertSavedSearch } from "@/lib/search/saved";

export const dynamic = "force-dynamic";

export async function GET() {
  const searches = await listSavedSearches();
  return noCacheJson({ searches, count: searches.length, fetchedAt: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.name || !body?.query) {
    return noCacheJson({ error: "id, name, query required" }, { status: 400 });
  }
  const search = await upsertSavedSearch({
    id: String(body.id),
    name: String(body.name).slice(0, 120),
    query: String(body.query).slice(0, 500),
    filters: body.filters ?? {},
    schedule: body.schedule ?? "manual",
    enabled: body.enabled !== false,
  });
  return noCacheJson({ search, fetchedAt: new Date().toISOString() });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return noCacheJson({ error: "id required" }, { status: 400 });
  await deleteSavedSearch(id);
  return noCacheJson({ ok: true });
}
