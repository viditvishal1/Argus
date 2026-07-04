// Aviation connectors — OpenSky Network live states (anonymous free tier,
// bbox-limited to keep payloads small) + FAA airspace system status.

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

export const REGIONS: Record<string, { label: string; bbox: [number, number, number, number] }> = {
  europe: { label: "Europe", bbox: [35, -12, 62, 32] },
  usa: { label: "United States", bbox: [24, -126, 50, -66] },
  india: { label: "India / South Asia", bbox: [5, 65, 37, 95] },
  easia: { label: "East Asia", bbox: [18, 95, 48, 148] },
  mideast: { label: "Middle East", bbox: [12, 32, 42, 65] },
};

type OpenSkyState = [
  string, string | null, string, number | null, number,
  number | null, number | null, number | null, boolean,
  number | null, number | null, ...unknown[],
];

export async function fetchFlights(region: string): Promise<Item[]> {
  const r = REGIONS[region] ?? REGIONS.europe;
  const [lamin, lomin, lamax, lomax] = r.bbox;
  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  const res = await fetchWithTimeout(url, { timeoutMs: 15000 });
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status} (anonymous tier is rate-limited — try again in a minute)`);
  const data = await res.json();
  const states: OpenSkyState[] = data.states ?? [];
  return states
    .filter((s) => s[5] != null && s[6] != null && !s[8])
    .slice(0, 400)
    .map((s): Item => {
      const callsign = (s[1] ?? "").trim() || s[0].toUpperCase();
      const airlinePrefix = callsign.match(/^[A-Z]{3}/)?.[0];
      return {
        id: `flight:${s[0]}`,
        module: "aviation",
        connectorId: "opensky_states",
        title: callsign,
        summary: `${callsign} · ${s[2]} · alt ${s[7] ? Math.round(s[7]) + " m" : "n/a"} · ${s[9] ? Math.round((s[9] as number) * 3.6) + " km/h" : ""}`,
        source: "OpenSky Network",
        url: `https://opensky-network.org/aircraft-profile?icao24=${s[0]}`,
        timestamp: new Date((s[4] as number) * 1000).toISOString(),
        lat: s[6] as number,
        lon: s[5] as number,
        tags: ["flight", r.label.toLowerCase()],
        region: r.label,
        entities: airlinePrefix
          ? [{ name: airlinePrefix, type: "organization" }, { name: callsign, type: "aircraft" }]
          : [{ name: callsign, type: "aircraft" }],
        contentPolicy: "full_cache",
        extra: {
          icao24: s[0],
          originCountry: s[2],
          altitudeM: s[7],
          velocityMs: s[9],
          heading: s[10],
        },
      };
    });
}

registerConnector(
  {
    id: "opensky_states",
    module: "aviation",
    source: "OpenSky Network",
    sourceUrl: "https://opensky-network.org",
    scheduleSeconds: 90,
    contentPolicy: "full_cache",
    entityTypes: ["aircraft", "organization"],
  },
  () => fetchFlights("europe"),
);

registerConnector(
  {
    id: "faa_status",
    module: "aviation",
    source: "FAA NAS Status",
    sourceUrl: "https://nasstatus.faa.gov",
    scheduleSeconds: 600,
    contentPolicy: "full_cache",
    entityTypes: ["location", "event"],
  },
  async () => {
    const res = await fetchWithTimeout("https://nasstatus.faa.gov/api/airport-status-information", {
      timeoutMs: 12000,
      headers: { Accept: "application/xml" },
    });
    if (!res.ok) throw new Error(`FAA HTTP ${res.status}`);
    const xml = await res.text();
    // The FAA feed is XML; extract delay entries with a tolerant regex scan
    // rather than a strict schema (the feed's structure varies by event type).
    const items: Item[] = [];
    const delayRe = /<Delay_type>[\s\S]*?<Name>([^<]+)<\/Name>([\s\S]*?)<\/Delay_type>/g;
    const airportRe = /<ARPT>([^<]+)<\/ARPT>|<Airport>([^<]+)<\/Airport>/g;
    let m: RegExpExecArray | null;
    while ((m = delayRe.exec(xml)) !== null) {
      const kind = m[1];
      const block = m[2];
      const airports = new Set<string>();
      let a: RegExpExecArray | null;
      while ((a = airportRe.exec(block)) !== null) airports.add(a[1] ?? a[2]);
      for (const code of airports) {
        items.push({
          id: `faa:${kind}:${code}`,
          module: "aviation",
          connectorId: "faa_status",
          title: `${code}: ${kind}`,
          summary: `FAA reports ${kind.toLowerCase()} affecting ${code}.`,
          source: "FAA NAS Status",
          url: "https://nasstatus.faa.gov",
          timestamp: new Date().toISOString(),
          severity: 5,
          severityLabel: kind,
          tags: ["airport-delay"],
          region: "United States",
          entities: [{ name: code, type: "location" }],
          contentPolicy: "full_cache",
        });
      }
    }
    return items;
  },
);

export const AVIATION_CONNECTOR_IDS = ["opensky_states", "faa_status"];
