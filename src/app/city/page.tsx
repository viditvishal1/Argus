"use client";

// City Digital Twin — per-city composite view (PRD §17.12): live weather,
// air quality, nearby seismic/natural events, and city news in one screen.

import { useEffect, useMemo, useState } from "react";
import { CloudSun, Wind } from "lucide-react";
import type { Item } from "@/lib/types";
import { MapView } from "@/components/MapView";
import { ItemCard } from "@/components/ModuleView";
import { ReaderPane } from "@/components/ReaderPane";

const CITIES = [
  { id: "delhi", name: "New Delhi", lat: 28.61, lon: 77.21 },
  { id: "mumbai", name: "Mumbai", lat: 19.08, lon: 72.88 },
  { id: "bengaluru", name: "Bengaluru", lat: 12.97, lon: 77.59 },
  { id: "london", name: "London", lat: 51.51, lon: -0.13 },
  { id: "nyc", name: "New York", lat: 40.71, lon: -74.01 },
  { id: "sf", name: "San Francisco", lat: 37.77, lon: -122.42 },
  { id: "tokyo", name: "Tokyo", lat: 35.68, lon: 139.69 },
  { id: "singapore", name: "Singapore", lat: 1.35, lon: 103.82 },
  { id: "dubai", name: "Dubai", lat: 25.2, lon: 55.27 },
];

interface Weather {
  temperatureC: number; windKmh: number; humidity: number;
  precipitationMm: number; aqiUs?: number; pm25?: number; fetchedAt: string;
}

function distKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function CityPage() {
  const [city, setCity] = useState(CITIES[0]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [earthItems, setEarthItems] = useState<Item[]>([]);
  const [news, setNews] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);

  useEffect(() => {
    setWeather(null);
    setNews([]);
    setSelected(null);
    fetch(`/api/weather?lat=${city.lat}&lon=${city.lon}`).then((r) => r.json())
      .then((d) => typeof d.temperatureC === "number" && setWeather(d));
    fetch(`/api/search?q=${encodeURIComponent(city.name)}`).then((r) => r.json())
      .then((d) => {
        const all: Item[] = Object.values(d.grouped ?? {}).flat() as Item[];
        setNews(all.filter((i) => i.module === "news").slice(0, 12));
      });
    fetch("/api/modules/earth").then((r) => r.json()).then((d) => setEarthItems(d.items ?? []));
  }, [city]);

  const nearby = useMemo(
    () =>
      earthItems
        .filter((i) => i.lat != null && i.lon != null)
        .map((i) => ({ i, d: distKm(city.lat, city.lon, i.lat!, i.lon!) }))
        .filter((x) => x.d < 800)
        .sort((a, b) => a.d - b.d)
        .slice(0, 10),
    [earthItems, city],
  );

  const aqiTone = (aqi?: number) =>
    aqi == null ? "text-ink" : aqi > 150 ? "text-red-400" : aqi > 100 ? "text-orange-400" : aqi > 50 ? "text-amber-300" : "text-emerald-300";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-lg font-semibold text-ink">City Digital Twin</h1>
        {CITIES.map((c) => (
          <button key={c.id} onClick={() => setCity(c)}
            className={`rounded-full border px-2.5 py-1 text-xs ${city.id === c.id ? "border-indigo-700 bg-indigo-950/50 text-indigo-300" : "border-line text-ink-dim hover:text-ink"}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-dim">
            <CloudSun className="h-3 w-3" /> Temperature
          </div>
          <div className="mono mt-1 text-xl font-semibold text-ink">
            {weather ? `${weather.temperatureC.toFixed(1)}°C` : "—"}
          </div>
          <div className="text-[11px] text-ink-dim">{weather ? `humidity ${weather.humidity}% · precip ${weather.precipitationMm} mm` : "Open-Meteo"}</div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-dim">
            <Wind className="h-3 w-3" /> Wind
          </div>
          <div className="mono mt-1 text-xl font-semibold text-ink">{weather ? `${weather.windKmh.toFixed(0)} km/h` : "—"}</div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-dim">Air quality (US AQI)</div>
          <div className={`mono mt-1 text-xl font-semibold ${aqiTone(weather?.aqiUs)}`}>{weather?.aqiUs ?? "—"}</div>
          <div className="text-[11px] text-ink-dim">{weather?.pm25 != null ? `PM2.5 ${weather.pm25} µg/m³` : ""}</div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-dim">Natural events &lt; 800 km</div>
          <div className="mono mt-1 text-xl font-semibold text-ink">{nearby.length}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <div>
          <MapView
            layers={[{ id: "nearby", color: "#fb923c", items: nearby.map((x) => x.i) }]}
            center={[city.lon, city.lat]}
            zoom={5.5}
            className="h-72 w-full"
            defaultBasemap="satellite"
            onSelect={(id) => setSelected(nearby.map((x) => x.i).find((i) => i.id === id) ?? null)}
          />
          <h2 className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-ink-dim">Nearby events</h2>
          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
            {nearby.map(({ i, d }) => (
              <ItemCard key={i.id} item={{ ...i, summary: `${d.toFixed(0)} km away — ${i.summary ?? ""}` }}
                selected={selected?.id === i.id} onSelect={() => setSelected(i)} />
            ))}
            {nearby.length === 0 && <div className="py-4 text-xs text-ink-dim">No tracked natural events within 800 km.</div>}
          </div>
        </div>
        <div>
          {selected ? (
            <ReaderPane item={selected} onClose={() => setSelected(null)} />
          ) : (
            <>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-dim">
                News mentioning {city.name}
              </h2>
              <div className="flex max-h-[65vh] flex-col gap-1.5 overflow-y-auto">
                {news.map((n) => (
                  <ItemCard key={n.id} item={n} selected={false} onSelect={() => setSelected(n)} />
                ))}
                {news.length === 0 && <div className="py-4 text-xs text-ink-dim">Searching city news…</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
