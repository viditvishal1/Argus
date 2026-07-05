import { runConnector, fetchFlights } from "@/lib/connectors";
import { fetchIss } from "@/lib/connectors/space";
import { seedLive } from "@/lib/live/store";
import { seedModuleLive } from "@/lib/live/module-cache";
import { writeSeedMeta } from "@/lib/live/seed-meta";
import { fetchAllWebcams } from "@/lib/live/webcams";
import type { Item } from "@/lib/types";

const FLIGHT_REGIONS = ["global", "europe", "usa", "india", "china", "mideast"] as const;
const SEED_MODULES = ["earth", "news", "conflict", "cyber", "markets", "space"] as const;

export async function seedLiveDomains(): Promise<{
  flights: Record<string, number>;
  ships: number;
  webcams: number;
  iss: number;
  modules: Record<string, number>;
}> {
  const flights: Record<string, number> = {};
  await Promise.all(
    FLIGHT_REGIONS.map(async (region) => {
      try {
        const items: Item[] = await fetchFlights(region, "full");
        await seedLive(`flights:${region}`, items, "OpenSky/adsb.lol/Wingbits");
        await writeSeedMeta(`flights:${region}`, items.length, "OpenSky/adsb.lol/Wingbits");
        flights[region] = items.length;
      } catch {
        flights[region] = -1;
      }
    }),
  );

  let ships = 0;
  try {
    const items = (await runConnector("aishub_vessels")).filter((i) => typeof i.lat === "number");
    await seedLive("ships:global", items, "AISHub");
    await writeSeedMeta("ships:global", items.length, "AISHub");
    ships = items.length;
  } catch {
    ships = -1;
  }

  let webcams = 0;
  try {
    const items = await fetchAllWebcams();
    await seedLive("webcams:all", items, "Curated + Windy");
    await writeSeedMeta("webcams:all", items.length, "Curated + Windy");
    webcams = items.length;
  } catch {
    webcams = -1;
  }

  let iss = 0;
  try {
    const pos = await fetchIss();
    if (pos && typeof pos.lat === "number") {
      await seedLive("iss:position", pos, "wheretheiss.at");
      await writeSeedMeta("iss:position", 1, "wheretheiss.at");
      iss = 1;
    }
  } catch {
    iss = -1;
  }

  const modules: Record<string, number> = {};
  await Promise.all(
    SEED_MODULES.map(async (mod) => {
      modules[mod] = await seedModuleLive(mod);
    }),
  );

  return { flights, ships, webcams, iss, modules };
}
