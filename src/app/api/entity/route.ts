import { NextRequest, NextResponse } from "next/server";
import { MODULE_CONNECTORS, runConnectorsWithBudget } from "@/lib/connectors";
import { entityNeighborhood } from "@/lib/graph";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await runConnectorsWithBudget(Object.values(MODULE_CONNECTORS).flat());
  const hood = entityNeighborhood(id);
  if (!hood) return NextResponse.json({ error: "entity not found" }, { status: 404 });
  return NextResponse.json(hood);
}
