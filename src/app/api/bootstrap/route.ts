import { NextResponse } from "next/server";
import { readLive } from "@/lib/live/store";
import { readModuleLive } from "@/lib/live/module-cache";
import { readAllSeedMeta } from "@/lib/live/seed-meta";
import { fetchIss } from "@/lib/connectors";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

const FLIGHT_REGIONS = ["global", "europe", "usa", "india"] as const;
const MODULES = ["earth", "news", "conflict", "cyber", "markets"] as const;

type IssPosition = Awaited<ReturnType<typeof fetchIss>>;

/** Single hydration endpoint — reads pre-seeded Redis keys only (World Monitor bootstrap pattern). */
export async function GET() {
  const started = Date.now();

  const flightResults = await Promise.all(
    FLIGHT_REGIONS.map((region) =>
      readLive<Item[]>(`flights:${region}`, async () => [], {
        ttlSeconds: 90,
        source: "OpenSky/adsb.lol/Wingbits",
        fallback: [],
        coldTimeoutMs: 1,
      }).then((r) => ({ region, ...r })),
    ),
  );

  const [ships, webcams, iss, ...moduleResults] = await Promise.all([
    readLive<Item[]>("ships:global", async () => [], {
      ttlSeconds: 45,
      source: "AISHub",
      fallback: [],
      coldTimeoutMs: 1,
    }),
    readLive<unknown[]>("webcams:all", async () => [], {
      ttlSeconds: 86_400,
      source: "Curated + Windy",
      fallback: [],
      coldTimeoutMs: 1,
    }),
    readLive<IssPosition | null>("iss:position", fetchIss, {
      ttlSeconds: 30,
      source: "wheretheiss.at",
      fallback: null,
      coldTimeoutMs: 4_000,
    }),
    ...MODULES.map((m) => readModuleLive(m)),
  ]);

  const globalFlights = flightResults.find((f) => f.region === "global") ?? flightResults[0];
  const meta = await readAllSeedMeta([
    "flights:global",
    "ships:global",
    "webcams:all",
    "module:markets",
    "module:earth",
  ]);

  const modules: Record<string, { items: Item[]; stale: boolean; ageSeconds: number | null }> = {};
  moduleResults.forEach((res, i) => {
    if (!res) return;
    modules[MODULES[i]] = {
      items: res.data,
      stale: res.stale,
      ageSeconds: res.ageSeconds == null ? null : Math.round(res.ageSeconds),
    };
  });

  return NextResponse.json({
    flights: {
      global: globalFlights.data,
      europe: flightResults.find((f) => f.region === "europe")?.data ?? [],
      stale: globalFlights.stale,
      cold: globalFlights.cold,
      ageSeconds: globalFlights.ageSeconds == null ? null : Math.round(globalFlights.ageSeconds),
      updatedAt: globalFlights.updatedAt,
    },
    ships: {
      items: ships.data,
      stale: ships.stale,
      ageSeconds: ships.ageSeconds == null ? null : Math.round(ships.ageSeconds),
    },
    webcams: {
      items: webcams.data,
      stale: webcams.stale,
    },
    iss: iss.data,
    modules,
    seedMeta: meta,
    hydratedMs: Date.now() - started,
    fetchedAt: new Date().toISOString(),
  });
}
