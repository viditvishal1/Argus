/**
 * Weather forecast connector (G27) — Open-Meteo, no API key.
 */

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

const CITIES: { name: string; lat: number; lon: number; iso2: string }[] = [
  { name: "Singapore", lat: 1.29, lon: 103.85, iso2: "SG" },
  { name: "New York", lat: 40.71, lon: -74.01, iso2: "US" },
  { name: "London", lat: 51.51, lon: -0.13, iso2: "GB" },
  { name: "Tokyo", lat: 35.68, lon: 139.69, iso2: "JP" },
  { name: "Dubai", lat: 25.2, lon: 55.27, iso2: "AE" },
  { name: "Mumbai", lat: 19.08, lon: 72.88, iso2: "IN" },
  { name: "Sydney", lat: -33.87, lon: 151.21, iso2: "AU" },
  { name: "Berlin", lat: 52.52, lon: 13.41, iso2: "DE" },
];

registerConnector(
  {
    id: "open_meteo_forecast",
    module: "earth",
    source: "Open-Meteo",
    sourceUrl: "https://open-meteo.com",
    scheduleSeconds: 3600,
    contentPolicy: "metadata_only",
    entityTypes: ["location", "event"],
  },
  async () => {
    const now = new Date().toISOString();
    const items: Item[] = [];
    for (const city of CITIES) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,precipitation_sum,weathercode&timezone=auto&forecast_days=3`;
      const res = await fetchWithTimeout(url, { timeoutMs: 10000 }).catch(() => null);
      if (!res?.ok) continue;
      const data = await res.json().catch(() => null) as {
        daily?: { time?: string[]; temperature_2m_max?: number[]; precipitation_sum?: number[] };
      } | null;
      const t0 = data?.daily?.temperature_2m_max?.[0];
      const p0 = data?.daily?.precipitation_sum?.[0];
      const day = data?.daily?.time?.[0] ?? "today";
      if (t0 == null) continue;
      items.push({
        id: `forecast:${city.iso2}:${day}`,
        module: "earth",
        connectorId: "open_meteo_forecast",
        title: `${city.name} forecast · ${Math.round(t0)}°C max`,
        summary: p0 != null ? `Precip ${p0.toFixed(1)} mm · ${day}` : `${day}`,
        source: "Open-Meteo",
        timestamp: now,
        lat: city.lat,
        lon: city.lon,
        tags: ["forecast", "weather", city.iso2.toLowerCase()],
        region: city.name,
        entities: [{ name: city.name, type: "location" }],
        contentPolicy: "metadata_only",
        extra: { iso2: city.iso2, tempMax: t0, precip: p0, day },
      });
    }
    return items;
  },
);

export const FORECAST_CONNECTOR_ID = "open_meteo_forecast";
