import { NextRequest, NextResponse } from "next/server";
import { MODULE_CONNECTORS } from "@/lib/connectors";
import { readModuleLive } from "@/lib/live/module-cache";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params;
  if (!MODULE_CONNECTORS[module]) {
    return NextResponse.json({ error: "unknown module" }, { status: 404 });
  }

  const result = await readModuleLive(module);
  if (!result) {
    return NextResponse.json({ error: "unknown module" }, { status: 404 });
  }

  return NextResponse.json({
    items: result.data,
    stale: result.stale,
    cold: result.cold,
    updatedAt: result.updatedAt,
    ageSeconds: result.ageSeconds == null ? null : Math.round(result.ageSeconds),
    fetchedAt: result.fetchedAt,
  });
}
