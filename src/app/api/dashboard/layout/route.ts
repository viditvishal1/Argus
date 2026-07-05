import { NextRequest, NextResponse } from "next/server";
import type { DashboardLayout } from "@/lib/panels/types";
import { isPrincipalError, requirePrivateApi } from "@/lib/auth/api-guard";
import { resolveDbClient } from "@/lib/auth/api-session";

export const dynamic = "force-dynamic";

const LAYOUT_KEY = "intelligence";

export async function GET(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  if (auth.role !== "user") {
    return NextResponse.json({ layout: null, note: "Cloud sync requires sign-in" });
  }

  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ layout: null });

  const { data: dash } = await c
    .from("dashboards")
    .select("id, name, config, version")
    .eq("owner_id", auth.id)
    .eq("is_default", true)
    .maybeSingle();

  if (!dash) return NextResponse.json({ layout: null });

  const { data: panels } = await c
    .from("panel_instances")
    .select("id, panel_key, x, y, w, h, tab_group, config")
    .eq("dashboard_id", dash.id)
    .order("sort_order", { ascending: true });

  const layout: DashboardLayout = {
    id: String(dash.id),
    name: String(dash.name ?? "Intelligence"),
    version: Number(dash.version ?? 1),
    panels: (panels ?? []).map((p) => ({
      id: String(p.id),
      panelKey: String(p.panel_key),
      x: Number(p.x),
      y: Number(p.y),
      w: Number(p.w),
      h: Number(p.h),
      tabGroup: p.tab_group ? String(p.tab_group) : undefined,
      config: (p.config as Record<string, unknown>) ?? undefined,
    })),
  };

  return NextResponse.json({ layout });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePrivateApi(req);
  if (isPrincipalError(auth)) return auth;
  if (auth.role !== "user") {
    return NextResponse.json({ error: "sign in required for cloud layout sync" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as DashboardLayout | null;
  if (!body?.panels) {
    return NextResponse.json({ error: "layout with panels required" }, { status: 400 });
  }

  const c = await resolveDbClient(auth);
  if (!c) return NextResponse.json({ error: "database unavailable" }, { status: 503 });

  const { data: existing } = await c
    .from("dashboards")
    .select("id")
    .eq("owner_id", auth.id)
    .eq("is_default", true)
    .maybeSingle();

  let dashboardId = existing?.id as string | undefined;
  const now = new Date().toISOString();

  if (!dashboardId) {
    const { data: created, error } = await c
      .from("dashboards")
      .insert({
        owner_id: auth.id,
        name: body.name ?? "Intelligence",
        is_default: true,
        config: { preset: LAYOUT_KEY },
        version: body.version ?? 1,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    dashboardId = created.id as string;
  } else {
    await c
      .from("dashboards")
      .update({ name: body.name, version: body.version ?? 1, updated_at: now })
      .eq("id", dashboardId);
    await c.from("panel_instances").delete().eq("dashboard_id", dashboardId);
  }

  const rows = body.panels.map((p, i) => {
    const row: Record<string, unknown> = {
      dashboard_id: dashboardId,
      panel_key: p.panelKey,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      tab_group: p.tabGroup ?? null,
      config: p.config ?? {},
      sort_order: i,
      updated_at: now,
    };
    if (/^[0-9a-f-]{36}$/i.test(p.id)) row.id = p.id;
    return row;
  });

  if (rows.length > 0) {
    const { error } = await c.from("panel_instances").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dashboardId });
}
