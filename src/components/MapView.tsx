"use client";

// Shared MapLibre map — used by Earth View, Aviation, Maritime and City Twin.
// Free CARTO dark basemap over OpenStreetMap data; each layer is a GeoJSON
// circle layer with its own accent color and click-to-detail popups handled
// by the parent via onSelect.

import { useEffect, useRef } from "react";
import maplibregl, { Map as MlMap } from "maplibre-gl";
import type { Item } from "@/lib/types";

export interface MapLayer {
  id: string;
  color: string;
  items: Item[];
  radius?: number;
}

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

function toGeoJSON(items: Item[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items
      .filter((i) => typeof i.lat === "number" && typeof i.lon === "number")
      .map((i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [i.lon!, i.lat!] },
        properties: { id: i.id, title: i.title, sev: i.severity ?? 0 },
      })),
  };
}

export function MapView({
  layers, onSelect, center = [10, 25], zoom = 1.6, className,
}: {
  layers: MapLayer[];
  onSelect?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const layersRef = useRef<Set<string>>(new Set());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: el.current,
      style: STYLE,
      center,
      zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; layersRef.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      for (const layer of layers) {
        const srcId = `src-${layer.id}`;
        const data = toGeoJSON(layer.items);
        const existing = map.getSource(srcId) as maplibregl.GeoJSONSource | undefined;
        if (existing) {
          existing.setData(data);
        } else {
          map.addSource(srcId, { type: "geojson", data });
          map.addLayer({
            id: `lyr-${layer.id}`,
            type: "circle",
            source: srcId,
            paint: {
              "circle-radius": [
                "+", layer.radius ?? 4,
                ["*", 0.7, ["coalesce", ["get", "sev"], 0]],
              ],
              "circle-color": layer.color,
              "circle-opacity": 0.75,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#0a0d12",
            },
          });
          map.on("click", `lyr-${layer.id}`, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            new maplibregl.Popup({ closeButton: false, offset: 8 })
              .setLngLat(e.lngLat)
              .setText(String(f.properties?.title ?? ""))
              .addTo(map);
            if (f.properties?.id) onSelectRef.current?.(String(f.properties.id));
          });
          map.on("mouseenter", `lyr-${layer.id}`, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", `lyr-${layer.id}`, () => { map.getCanvas().style.cursor = ""; });
          layersRef.current.add(layer.id);
        }
      }
      // Remove layers that were toggled off.
      for (const known of [...layersRef.current]) {
        if (!layers.some((l) => l.id === known)) {
          if (map.getLayer(`lyr-${known}`)) map.removeLayer(`lyr-${known}`);
          if (map.getSource(`src-${known}`)) map.removeSource(`src-${known}`);
          layersRef.current.delete(known);
        }
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [layers]);

  return <div ref={el} className={className ?? "h-[calc(100vh-12rem)] w-full rounded-lg border border-line"} />;
}
