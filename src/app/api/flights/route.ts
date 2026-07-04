import { NextRequest, NextResponse } from "next/server";
import { fetchFlights, REGIONS } from "@/lib/connectors";

export const dynamic = "force-dynamic";

// Short-lived per-region cache so map panning doesn't hammer OpenSky's
// anonymous tier.
const g = globalThis as unknown as {
  __flightsCache?: Map<string, { at: number; items: unknown[] }>;
};
const cache = (g.__flightsCache ??= new Map());

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "europe";
  if (!REGIONS[region]) {
    return NextResponse.json({ error: "unknown region", regions: Object.keys(REGIONS) }, { status: 400 });
  }
  const hit = cache.get(region);
  if (hit && Date.now() - hit.at < 60_000) {
    return NextResponse.json({ items: hit.items, cached: true });
  }
  try {
    const items = await fetchFlights(region);
    cache.set(region, { at: Date.now(), items });
    return NextResponse.json({ items, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { items: hit?.items ?? [], error: err instanceof Error ? err.message : "fetch failed" },
      { status: hit ? 200 : 502 },
    );
  }
}
