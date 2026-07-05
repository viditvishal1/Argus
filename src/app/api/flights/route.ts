import { NextRequest, NextResponse } from "next/server";
import { fetchFlights, REGIONS } from "@/lib/connectors";
import { readLive } from "@/lib/live/store";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TTL_SECONDS = 75;

async function readFlightsRegion(region: string) {
  return readLive<Item[]>(
    `flights:${region}`,
    async () => {
      // Request path: fast hub probes only — never block on full global grid.
      if (region === "global") {
        try {
          return await fetchFlights("global", "fast");
        } catch {
          /* try europe cache as last resort below */
        }
      }
      return fetchFlights(region, "fast");
    },
    { ttlSeconds: TTL_SECONDS, source: "OpenSky/adsb.lol/Wingbits", fallback: [], coldTimeoutMs: 12_000 },
  );
}

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "global";
  if (!REGIONS[region]) {
    return NextResponse.json({ error: "unknown region", regions: Object.keys(REGIONS) }, { status: 400 });
  }

  let result = await readFlightsRegion(region);

  // Global cold miss → serve last-known europe/usa rather than empty.
  if (region === "global" && result.data.length === 0) {
    for (const fallback of ["europe", "usa", "india"] as const) {
      const alt = await readLive<Item[]>(`flights:${fallback}`, async () => [], {
        ttlSeconds: TTL_SECONDS,
        source: "OpenSky/adsb.lol/Wingbits",
        fallback: [],
        coldTimeoutMs: 1,
      });
      if (alt.data.length > 0) {
        result = { ...alt, source: `${alt.source} (fallback:${fallback})`, cold: result.cold };
        break;
      }
    }
  }

  return NextResponse.json({
    items: result.data,
    region,
    stale: result.stale,
    cold: result.cold,
    updatedAt: result.updatedAt,
    ageSeconds: result.ageSeconds == null ? null : Math.round(result.ageSeconds),
    fetchedAt: new Date().toISOString(),
  });
}
