import { NextRequest, NextResponse } from "next/server";
import { MODULE_CONNECTORS, runConnectorsWithBudget } from "@/lib/connectors";
import { entityNeighborhood } from "@/lib/graph";
import { checkRateLimit, clientKey, LIMITS } from "@/lib/security/rate-limit";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/entity");
  const rl = await checkRateLimit({ key: `entity:${clientKey(req)}`, ...LIMITS.graph });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let hood = entityNeighborhood(id);
  if (!hood) {
    const mod = id.split(":")[0];
    const ids = MODULE_CONNECTORS[mod] ?? Object.values(MODULE_CONNECTORS).flat().slice(0, 6);
    await runConnectorsWithBudget(ids, 6000);
    hood = entityNeighborhood(id);
  }

  if (!hood) return NextResponse.json({ error: "entity not found" }, { status: 404 });
  return NextResponse.json(hood);
}
