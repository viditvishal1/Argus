import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { trackApiRequest } from "@/lib/usage/tracker";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { ownerIdForInsert, resolveDbClient } from "@/lib/auth/api-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  await trackApiRequest("/api/investigations");
  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ investigations: [], note: "Database unavailable" });
  const { data, error } = await c.from("investigations").select("*").order("updated_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ investigations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  await trackApiRequest("/api/investigations");
  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ error: "database unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const id = `inv_${Date.now().toString(36)}`;
  const title = String(body.title ?? "Untitled investigation").slice(0, 200);
  const ownerId = ownerIdForInsert(auth);
  const row: Record<string, unknown> = {
    id,
    title,
    status: "open",
    hypothesis: body.hypothesis ?? null,
  };
  if (ownerId) row.owner_id = ownerId;

  const { data, error } = await c.from("investigations").insert(row).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ investigation: data });
}
