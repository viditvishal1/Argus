import { NextRequest, NextResponse } from "next/server";
import { trackApiRequest } from "@/lib/usage/tracker";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { ownerIdForInsert, resolveDbClient } from "@/lib/auth/api-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  await trackApiRequest("/api/watchlists");
  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ watchlists: [], note: "Database unavailable" });
  const { data, error } = await c.from("watchlists").select("*").order("updated_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ watchlists: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  await trackApiRequest("/api/watchlists");
  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ error: "database unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const id = body.id ?? `wl_${Date.now().toString(36)}`;
  const ownerId = ownerIdForInsert(auth);
  const row: Record<string, unknown> = {
    id,
    name: String(body.name ?? "Watchlist").slice(0, 120),
    entity_ids: body.entityIds ?? [],
    symbols: body.symbols ?? [],
    updated_at: new Date().toISOString(),
  };
  if (ownerId) row.owner_id = ownerId;

  const { data, error } = await c.from("watchlists").upsert(row).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ watchlist: data });
}
