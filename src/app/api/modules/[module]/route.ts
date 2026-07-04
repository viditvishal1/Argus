import { NextRequest, NextResponse } from "next/server";
import { MODULE_CONNECTORS, runConnectors } from "@/lib/connectors";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params;
  const ids = MODULE_CONNECTORS[module];
  if (!ids) return NextResponse.json({ error: "unknown module" }, { status: 404 });
  const items = await runConnectors(ids);
  return NextResponse.json({ items, fetchedAt: new Date().toISOString() });
}
