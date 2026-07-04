import { NextRequest, NextResponse } from "next/server";
import { MODULE_CONNECTORS, runConnectors } from "@/lib/connectors";
import { graphSnapshot } from "@/lib/graph";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Ensure the graph is populated: running connectors ingests their entities.
  await runConnectors(Object.values(MODULE_CONNECTORS).flat());
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "120", 10);
  return NextResponse.json(graphSnapshot({ q, type, limit }));
}
