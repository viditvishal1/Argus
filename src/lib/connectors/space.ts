// Space connectors — ISS position (wheretheiss.at), upcoming launches
// (Launch Library 2 / TheSpaceDevs), space weather alerts (NOAA SWPC),
// recently launched satellites (CelesTrak).

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

export async function fetchIss(): Promise<{
  lat: number; lon: number; altitudeKm?: number; velocityKmh?: number; timestamp: string;
}> {
  try {
    const res = await fetchWithTimeout("https://api.wheretheiss.at/v1/satellites/25544", {
      timeoutMs: 16000,
    });
    if (!res.ok) throw new Error(`wheretheiss HTTP ${res.status}`);
    const d = await res.json();
    return {
      lat: d.latitude,
      lon: d.longitude,
      altitudeKm: d.altitude,
      velocityKmh: d.velocity,
      timestamp: new Date(d.timestamp * 1000).toISOString(),
    };
  } catch {
    // Fallback: open-notify has position only, but responds fast.
    const res = await fetchWithTimeout("http://api.open-notify.org/iss-now.json", {
      timeoutMs: 8000,
    });
    if (!res.ok) throw new Error(`open-notify HTTP ${res.status}`);
    const d = await res.json();
    return {
      lat: parseFloat(d.iss_position.latitude),
      lon: parseFloat(d.iss_position.longitude),
      timestamp: new Date(d.timestamp * 1000).toISOString(),
    };
  }
}

registerConnector(
  {
    id: "spacedevs_launches",
    module: "space",
    source: "Launch Library 2",
    sourceUrl: "https://thespacedevs.com",
    scheduleSeconds: 1800,
    contentPolicy: "full_cache",
    entityTypes: ["organization", "event", "location"],
  },
  async () => {
    const res = await fetchWithTimeout(
      "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=20&mode=list",
      { timeoutMs: 12000 },
    );
    if (!res.ok) throw new Error(`SpaceDevs HTTP ${res.status} (free tier: 15 req/hr)`);
    const data = await res.json();
    interface LaunchRow {
      id: string; name: string; net: string; status: { name: string; abbrev: string };
      lsp_name: string; location: string; mission: string | null;
      mission_type: string | null; orbit: string | null; image: string | null;
    }
    return (data.results as LaunchRow[]).map((l): Item => ({
      id: `launch:${l.id}`,
      module: "space",
      connectorId: "spacedevs_launches",
      title: l.name,
      summary: `${l.lsp_name} · ${l.location} · ${l.status.name} · NET ${new Date(l.net).toUTCString()}${l.orbit ? ` · ${l.orbit}` : ""}`,
      body: l.mission ?? undefined,
      source: "Launch Library 2",
      url: `https://spacelaunchnow.me/launch/${l.id}`,
      timestamp: l.net,
      tags: ["launch", ...(l.mission_type ? [l.mission_type.toLowerCase()] : [])],
      region: l.location,
      entities: [
        { name: l.lsp_name, type: "organization" },
        { name: l.name, type: "event" },
        { name: l.location.split(",").pop()?.trim() ?? l.location, type: "location" },
      ],
      contentPolicy: "full_cache",
      extra: { status: l.status.name, image: l.image },
    }));
  },
);

registerConnector(
  {
    id: "noaa_swpc_alerts",
    module: "space",
    source: "NOAA SWPC",
    sourceUrl: "https://www.swpc.noaa.gov",
    scheduleSeconds: 900,
    contentPolicy: "full_cache",
    entityTypes: ["event"],
  },
  async () => {
    const res = await fetchWithTimeout("https://services.swpc.noaa.gov/products/alerts.json");
    if (!res.ok) throw new Error(`SWPC HTTP ${res.status}`);
    const data: { product_id: string; issue_datetime: string; message: string }[] =
      await res.json();
    return data.slice(0, 25).map((a, i): Item => {
      const firstLine =
        a.message.split("\n").find((l) => /^(ALERT|WARNING|WATCH|SUMMARY|EXTENDED)/.test(l)) ??
        a.message.split("\n")[0];
      const severity = /WARNING/.test(a.message) ? 7 : /ALERT/.test(a.message) ? 6 : 3;
      return {
        id: `swpc:${a.product_id}:${a.issue_datetime}:${i}`,
        module: "space",
        connectorId: "noaa_swpc_alerts",
        title: firstLine.replace(/^(ALERT|WARNING|WATCH|SUMMARY|EXTENDED):?\s*/, "").slice(0, 120) || "Space weather bulletin",
        summary: firstLine,
        body: a.message,
        source: "NOAA SWPC",
        url: "https://www.swpc.noaa.gov/products/alerts-watches-and-warnings",
        timestamp: new Date(a.issue_datetime + "Z").toISOString(),
        severity,
        severityLabel: /WARNING/.test(a.message) ? "WARNING" : /ALERT/.test(a.message) ? "ALERT" : "BULLETIN",
        tags: ["space-weather"],
        entities: [{ name: "Sun", type: "location" }],
        contentPolicy: "full_cache",
      };
    });
  },
);

registerConnector(
  {
    id: "celestrak_recent",
    module: "space",
    source: "CelesTrak",
    sourceUrl: "https://celestrak.org",
    scheduleSeconds: 3600,
    contentPolicy: "full_cache",
    entityTypes: ["satellite"],
  },
  async () => {
    const res = await fetchWithTimeout(
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json",
      { timeoutMs: 12000 },
    );
    if (!res.ok) throw new Error(`CelesTrak HTTP ${res.status}`);
    interface Gp {
      OBJECT_NAME: string; OBJECT_ID: string; NORAD_CAT_ID: number;
      EPOCH: string; MEAN_MOTION: number; INCLINATION: number;
    }
    const data: Gp[] = await res.json();
    return data.slice(0, 60).map((s): Item => {
      const periodMin = 1440 / s.MEAN_MOTION;
      return {
        id: `sat:${s.NORAD_CAT_ID}`,
        module: "space",
        connectorId: "celestrak_recent",
        title: s.OBJECT_NAME,
        summary: `NORAD ${s.NORAD_CAT_ID} · Intl ${s.OBJECT_ID} · inclination ${s.INCLINATION.toFixed(1)}° · period ${periodMin.toFixed(0)} min`,
        source: "CelesTrak",
        url: `https://celestrak.org/satcat/table-satcat.php?CATNR=${s.NORAD_CAT_ID}`,
        timestamp: new Date(s.EPOCH).toISOString(),
        tags: ["satellite", "recent-launch"],
        entities: [{ name: s.OBJECT_NAME, type: "satellite" }],
        contentPolicy: "full_cache",
        extra: { noradId: s.NORAD_CAT_ID, inclination: s.INCLINATION, periodMin },
      };
    });
  },
);

export const SPACE_CONNECTOR_IDS = ["spacedevs_launches", "noaa_swpc_alerts", "celestrak_recent"];

/** Current planetary K-index (geomagnetic activity, 0-9). */
export async function fetchKIndex(): Promise<{ kp: number; time: string } | null> {
  const res = await fetchWithTimeout(
    "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
    { timeoutMs: 10000 },
  );
  if (!res.ok) return null;
  const rows: { time_tag: string; kp_index: number; estimated_kp: number }[] = await res.json();
  const last = rows[rows.length - 1];
  return last ? { kp: last.estimated_kp ?? last.kp_index, time: last.time_tag } : null;
}
