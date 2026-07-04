// Earth View connectors — earthquakes (USGS), natural events: wildfires,
// volcanoes, severe storms (NASA EONET). Weather + air quality (Open-Meteo)
// are per-coordinate lookups exposed via lib functions, not polled feeds.

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

registerConnector(
  {
    id: "usgs_earthquakes",
    module: "earth",
    source: "USGS",
    sourceUrl: "https://earthquake.usgs.gov",
    scheduleSeconds: 300,
    contentPolicy: "full_cache",
    entityTypes: ["location", "event"],
  },
  async () => {
    const res = await fetchWithTimeout(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    );
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const data = await res.json();
    interface QuakeFeature {
      id: string;
      properties: { mag: number | null; place: string | null; time: number; url: string; title: string };
      geometry: { coordinates: [number, number, number] };
    }
    return (data.features as QuakeFeature[])
      .filter((f) => (f.properties.mag ?? 0) >= 1.5)
      .map((f): Item => {
        const mag = f.properties.mag ?? 0;
        const place = f.properties.place ?? "Unknown location";
        return {
          id: `quake:${f.id}`,
          module: "earth",
          connectorId: "usgs_earthquakes",
          title: f.properties.title,
          summary: `Magnitude ${mag.toFixed(1)} earthquake, ${place}. Depth ${f.geometry.coordinates[2]?.toFixed(0)} km.`,
          url: f.properties.url,
          source: "USGS",
          timestamp: new Date(f.properties.time).toISOString(),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          severity: Math.min(10, mag),
          severityLabel: `M${mag.toFixed(1)}`,
          tags: ["earthquake"],
          region: place.split(", ").pop(),
          entities: [
            { name: place.split(", ").pop() ?? place, type: "location" },
            { name: f.properties.title, type: "event" },
          ],
          contentPolicy: "full_cache",
        };
      });
  },
);

const EONET_CATEGORY_TAGS: Record<string, string> = {
  wildfires: "wildfire",
  volcanoes: "volcano",
  severeStorms: "storm",
  seaLakeIce: "ice",
  floods: "flood",
  drought: "drought",
};

registerConnector(
  {
    id: "nasa_eonet",
    module: "earth",
    source: "NASA EONET",
    sourceUrl: "https://eonet.gsfc.nasa.gov",
    scheduleSeconds: 900,
    contentPolicy: "full_cache",
    entityTypes: ["location", "event"],
  },
  async () => {
    const res = await fetchWithTimeout(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=120",
      { timeoutMs: 12000 },
    );
    if (!res.ok) throw new Error(`EONET HTTP ${res.status}`);
    const data = await res.json();
    interface EonetEvent {
      id: string;
      title: string;
      categories: { id: string; title: string }[];
      sources: { url: string }[];
      geometry: { coordinates: number[]; date: string; magnitudeValue?: number }[];
    }
    return (data.events as EonetEvent[]).map((e): Item => {
      const geo = e.geometry[e.geometry.length - 1];
      const cat = e.categories[0];
      return {
        id: `eonet:${e.id}`,
        module: "earth",
        connectorId: "nasa_eonet",
        title: e.title,
        summary: `${cat?.title ?? "Natural event"} tracked by NASA EONET. Last observation ${new Date(geo.date).toUTCString()}.`,
        url: e.sources[0]?.url,
        source: "NASA EONET",
        timestamp: geo.date,
        lat: typeof geo.coordinates[1] === "number" ? geo.coordinates[1] : undefined,
        lon: typeof geo.coordinates[0] === "number" ? geo.coordinates[0] : undefined,
        severity: cat?.id === "severeStorms" ? 6 : cat?.id === "wildfires" ? 5 : 4,
        severityLabel: cat?.title,
        tags: [EONET_CATEGORY_TAGS[cat?.id] ?? "natural-event"],
        entities: [{ name: e.title, type: "event" }],
        contentPolicy: "full_cache",
      };
    });
  },
);

export const EARTH_CONNECTOR_IDS = ["usgs_earthquakes", "nasa_eonet"];

export interface WeatherNow {
  temperatureC: number;
  windKmh: number;
  humidity: number;
  precipitationMm: number;
  weatherCode: number;
  aqiUs?: number;
  pm25?: number;
  fetchedAt: string;
}

/** Open-Meteo current weather + air quality for a coordinate (free, no key). */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherNow> {
  const [wRes, aRes] = await Promise.all([
    fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`,
    ),
    fetchWithTimeout(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5`,
    ).catch(() => null),
  ]);
  if (!wRes.ok) throw new Error(`Open-Meteo HTTP ${wRes.status}`);
  const w = await wRes.json();
  const a = aRes && aRes.ok ? await aRes.json() : null;
  return {
    temperatureC: w.current.temperature_2m,
    windKmh: w.current.wind_speed_10m,
    humidity: w.current.relative_humidity_2m,
    precipitationMm: w.current.precipitation,
    weatherCode: w.current.weather_code,
    aqiUs: a?.current?.us_aqi,
    pm25: a?.current?.pm2_5,
    fetchedAt: new Date().toISOString(),
  };
}
