// Maritime connectors — AISHub live vessel positions (free membership key
// required; the module degrades gracefully without it) + maritime news via
// Google News RSS so the module is never empty.

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";
import { searchGoogleNews } from "./news";

const VESSEL_TYPES: Record<number, string> = {
  30: "Fishing", 31: "Towing", 32: "Towing (large)", 35: "Military",
  36: "Sailing", 37: "Pleasure craft", 52: "Tug", 60: "Passenger",
  70: "Cargo", 71: "Cargo (hazardous A)", 72: "Cargo (hazardous B)",
  80: "Tanker", 81: "Tanker (hazardous A)", 90: "Other",
};

registerConnector(
  {
    id: "aishub_vessels",
    module: "maritime",
    source: "AISHub",
    sourceUrl: "https://www.aishub.net",
    scheduleSeconds: 120,
    contentPolicy: "full_cache",
    entityTypes: ["vessel"],
    requiresKey: "AISHUB_API_KEY",
  },
  async () => {
    const key = process.env.AISHUB_API_KEY;
    // English Channel / North Sea default window — densest free coverage.
    const url = `https://data.aishub.net/ws.php?username=${key}&format=1&output=json&compress=0&latmin=48&latmax=56&lonmin=-6&lonmax=10`;
    const res = await fetchWithTimeout(url, { timeoutMs: 15000 });
    if (!res.ok) throw new Error(`AISHub HTTP ${res.status}`);
    const data = await res.json();
    const rows: Record<string, unknown>[] = Array.isArray(data) ? data[1] ?? [] : [];
    return rows.slice(0, 300).map((v): Item => {
      const name = String(v.NAME ?? v.MMSI ?? "Unknown vessel").trim();
      const type = VESSEL_TYPES[Number(v.TYPE)] ?? "Vessel";
      return {
        id: `vessel:${v.MMSI}`,
        module: "maritime",
        connectorId: "aishub_vessels",
        title: name,
        summary: `${type} · MMSI ${v.MMSI} · SOG ${v.SOG ?? "?"} kn · dest ${String(v.DEST ?? "n/a").trim()}`,
        source: "AISHub",
        timestamp: new Date().toISOString(),
        lat: Number(v.LATITUDE),
        lon: Number(v.LONGITUDE),
        tags: ["vessel", type.toLowerCase()],
        entities: [{ name, type: "vessel" }],
        contentPolicy: "full_cache",
        extra: { mmsi: v.MMSI, type, destination: v.DEST, speedKn: v.SOG },
      };
    });
  },
);

registerConnector(
  {
    id: "maritime_news",
    module: "maritime",
    source: "Google News (maritime)",
    sourceUrl: "https://news.google.com",
    scheduleSeconds: 900,
    contentPolicy: "metadata_only",
    entityTypes: ["organization", "vessel", "location"],
  },
  async () => {
    const items = await searchGoogleNews("shipping OR maritime OR \"port congestion\" OR vessel");
    return items.map((it) => ({
      ...it,
      id: it.id.replace("gnews:", "maritime-news:"),
      module: "maritime",
      connectorId: "maritime_news",
      tags: ["maritime-news"],
    }));
  },
);

export const MARITIME_CONNECTOR_IDS = ["aishub_vessels", "maritime_news"];
