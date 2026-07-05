import { NextRequest, NextResponse } from "next/server";
import { getEntity360 } from "@/lib/ontology/store";
import { entityNeighborhood } from "@/lib/graph";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/entity360");
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [persisted, graph] = await Promise.all([
    getEntity360(id),
    Promise.resolve(entityNeighborhood(id)),
  ]);

  if (!persisted && !graph) {
    return NextResponse.json({ error: "entity not found" }, { status: 404 });
  }

  return NextResponse.json({
    id,
    persisted,
    graph,
    fetchedAt: new Date().toISOString(),
  });
}
