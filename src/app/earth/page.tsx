"use client";

// Earth View — the "mission control" map. Togglable live layers (PRD §17.2):
// earthquakes, wildfires, storms/floods, volcanoes, live flights, ISS.
// Clicking a marker opens the in-app detail panel — no external redirects.

import { useEffect, useMemo, useState } from "react";
import type { Item } from "@/lib/types";
import { MapView, type MapLayer } from "@/components/MapView";
import { ReaderPane } from "@/components/ReaderPane";
import { timeAgo } from "@/components/ModuleView";

const LAYER_DEFS = [
  { id: "earthquakes", label: "Earthquakes", color: "#fb923c", tags: ["earthquake"] },
  { id: "wildfires", label: "Wildfires", color: "#f87171", tags: ["wildfire"] },
  { id: "storms", label: "Storms & floods", color: "#38bdf8", tags: ["storm", "flood"] },
  { id: "volcanoes", label: "Volcanoes", color: "#e879f9", tags: ["volcano", "ice", "drought", "natural-event"] },
  { id: "flights", label: "Flights (Europe)", color: "#60a5fa", tags: ["flight"] },
  { id: "iss", label: "ISS", color: "#c4b5fd", tags: ["iss"] },
];

export default function EarthPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [flights, setFlights] = useState<Item[]>([]);
  const [iss, setIss] = useState<Item | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set(["earthquakes", "wildfires", "storms", "volcanoes", "iss"]));
  const [selected, setSelected] = useState<Item | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>();
  const [minMag, setMinMag] = useState(0);

  useEffect(() => {
    fetch("/api/modules/earth").then((r) => r.json()).then((d) => {
      if (d.items) { setItems(d.items); setFetchedAt(d.fetchedAt); }
    });
  }, []);

  useEffect(() => {
    if (!enabled.has("flights")) return;
    const load = () => fetch("/api/flights?region=europe").then((r) => r.json()).then((d) => setFlights(d.items ?? []));
    load();
    const t = setInterval(load, 90_000);
    return () => clearInterval(t);
  }, [enabled]);

  useEffect(() => {
    if (!enabled.has("iss")) return;
    const load = () =>
      fetch("/api/iss").then((r) => r.json()).then((d) => {
        if (typeof d.lat !== "number") return;
        setIss({
          id: "iss",
          module: "space",
          connectorId: "iss",
          title: "International Space Station",
          summary: d.altitudeKm != null
            ? `Altitude ${d.altitudeKm.toFixed(0)} km · velocity ${d.velocityKmh?.toFixed(0)} km/h`
            : `Position ${d.lat.toFixed(2)}°, ${d.lon.toFixed(2)}°`,
          source: "wheretheiss.at",
          timestamp: d.timestamp,
          lat: d.lat, lon: d.lon,
          tags: ["iss"],
          entities: [{ name: "ISS", type: "satellite" }],
          contentPolicy: "full_cache",
        });
      });
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [enabled]);

  const layers = useMemo((): MapLayer[] => {
    const out: MapLayer[] = [];
    for (const def of LAYER_DEFS) {
      if (!enabled.has(def.id)) continue;
      let layerItems: Item[];
      if (def.id === "flights") layerItems = flights;
      else if (def.id === "iss") layerItems = iss ? [iss] : [];
      else layerItems = items.filter((i) => def.tags.some((t) => i.tags.includes(t)));
      if (def.id === "earthquakes" && minMag > 0) {
        layerItems = layerItems.filter((i) => (i.severity ?? 0) >= minMag);
      }
      out.push({
        id: def.id,
        color: def.color,
        items: layerItems,
        radius: def.id === "iss" ? 8 : 4,
        icon: def.id === "flights" ? ("plane" as const) : undefined,
      });
    }
    return out;
  }, [items, flights, iss, enabled, minMag]);

  const allSelectable = useMemo(() => [...items, ...flights, ...(iss ? [iss] : [])], [items, flights, iss]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-lg font-semibold text-ink">Earth View</h1>
        {LAYER_DEFS.map((def) => (
          <button
            key={def.id}
            onClick={() => {
              const next = new Set(enabled);
              if (next.has(def.id)) next.delete(def.id); else next.add(def.id);
              setEnabled(next);
            }}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              enabled.has(def.id) ? "border-line bg-panel-2 text-ink" : "border-line bg-transparent text-ink-dim"
            }`}
            aria-pressed={enabled.has(def.id)}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: def.color, opacity: enabled.has(def.id) ? 1 : 0.3 }} />
            {def.label}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-ink-dim">
          Min magnitude
          <input type="range" min={0} max={7} step={0.5} value={minMag}
            onChange={(e) => setMinMag(parseFloat(e.target.value))} className="w-20 accent-[#fb923c]" />
          <span className="mono text-ink">{minMag || "all"}</span>
        </label>
        {fetchedAt && <span className="ml-auto text-[11px] text-ink-dim">events fetched {timeAgo(fetchedAt)}</span>}
      </div>

      <div className="relative">
        <MapView
          layers={layers}
          defaultBasemap="satellite"
          defaultGlobe
          zoom={2.2}
          onSelect={(id) => setSelected(allSelectable.find((i) => i.id === id) ?? null)}
        />
        {selected && (
          <div className="absolute right-3 top-3 z-20 max-h-[80%] w-96 max-w-[85%] overflow-hidden">
            <ReaderPane item={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
