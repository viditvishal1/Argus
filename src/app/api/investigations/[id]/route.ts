import { NextRequest, NextResponse } from "next/server";
import { trackApiRequest } from "@/lib/usage/tracker";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { resolveDbClient } from "@/lib/auth/api-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  const { id } = await ctx.params;
  await trackApiRequest("/api/investigations/detail");
  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ error: "database unavailable" }, { status: 503 });

  const [{ data: inv, error: invErr }, { data: evidence }, { data: notes }] = await Promise.all([
    c.from("investigations").select("*").eq("id", id).maybeSingle(),
    c.from("investigation_evidence").select("*").eq("investigation_id", id).order("pinned_at", { ascending: false }),
    c.from("investigation_notes").select("*").eq("investigation_id", id).order("created_at", { ascending: false }),
  ]);

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ investigation: inv, evidence: evidence ?? [], notes: notes ?? [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  const { id } = await ctx.params;
  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  const body = await req.json().catch(() => ({}));

  if (body.type === "note") {
    const { error } = await c.from("investigation_notes").insert({
      investigation_id: id,
      body: String(body.body ?? "").slice(0, 5000),
      author: body.author ?? auth.email ?? "analyst",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (body.type === "evidence") {
    const { error } = await c.from("investigation_evidence").insert({
      investigation_id: id,
      item_id: body.itemId ?? null,
      url: body.url ?? null,
      title: String(body.title ?? "Evidence").slice(0, 300),
      excerpt: body.excerpt ?? null,
      citation: body.citation ?? {},
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (body.status) {
    const { error } = await c.from("investigations")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
