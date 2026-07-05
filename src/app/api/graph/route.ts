import { NextRequest, NextResponse } from "next/server";
import { MODULE_CONNECTORS, runConnectorsWithBudget } from "@/lib/connectors";
import { graphSnapshot } from "@/lib/graph";
import { loadPersistedGraph } from "@/lib/ontology/persisted-graph";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { checkRateLimit, clientKey, LIMITS } from "@/lib/security/rate-limit";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/graph");
  const rl = await checkRateLimit({ key: `graph:${clientKey(req)}`, ...LIMITS.graph });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "120", 10);
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";

  const persisted = await loadPersistedGraph({ q, type, limit });

  if (!refresh && persisted.entities.length >= 5) {
    const mem = graphSnapshot({ q, type, limit });
    return NextResponse.json({
      entities: persisted.entities.length > 0 ? persisted.entities : mem.entities,
      edges: persisted.edges.length > 0 ? persisted.edges : mem.edges,
      items: persisted.items,
      totals: mem.totals,
      source: "indexed",
      fetchedAt: new Date().toISOString(),
    });
  }

  const background = await isFeatureEnabled("background_ingestion");
  if (refresh || !background) {
    const priorityIds = Object.values(MODULE_CONNECTORS).flat().slice(0, 8);
    await runConnectorsWithBudget(priorityIds, 8000);
  }

  const snapshot = graphSnapshot({ q, type, limit });
  return NextResponse.json({ ...snapshot, source: refresh ? "live_refresh" : "memory", fetchedAt: new Date().toISOString() });
}
