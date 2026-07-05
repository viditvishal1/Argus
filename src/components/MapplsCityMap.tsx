"use client";

// Mappls (MapMyIndia) interactive map for India — vector basemap + live traffic overlay.

import { useEffect, useRef, useState } from "react";

interface MapplsMapLike {
  addListener: (event: string, cb: (e?: { latlng?: { lat: number; lng: number } }) => void) => void;
  setCenter?: (center: [number, number]) => void;
  setZoom?: (zoom: number) => void;
}

declare global {
  interface Window {
    mappls?: {
      Map: new (id: string, opts: Record<string, unknown>) => MapplsMapLike;
      traffic: (opts: { map: MapplsMapLike }) => void;
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.mappls) resolve();
      else existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Mappls SDK failed to load"));
    document.head.appendChild(script);
  });
}

export function MapplsCityMap({
  lat,
  lon,
  zoom = 13,
  showTraffic = true,
  className,
  onLocationPick,
}: {
  lat: number;
  lon: number;
  zoom?: number;
  showTraffic?: boolean;
  className?: string;
  onLocationPick?: (lat: number, lon: number) => void;
}) {
  const containerId = useRef(`mappls-${Math.random().toString(36).slice(2)}`);
  const mapRef = useRef<MapplsMapLike | null>(null);
  const trafficOnRef = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    fetch("/api/mappls/config")
      .then((r) => r.json())
      .then(async (cfg) => {
        if (cancelled) return;
        if (!cfg.configured || !cfg.sdkUrl) {
          setState("unavailable");
          setDetail("MAPPLS_API_KEY not configured on server");
          return;
        }
        await loadScript(cfg.sdkUrl);
        if (cancelled || !window.mappls) {
          setState("unavailable");
          return;
        }

        const map = new window.mappls.Map(containerId.current, {
          center: [lat, lon],
          zoom,
          zoomControl: true,
          location: false,
        });
        mapRef.current = map;

        map.addListener("load", () => {
          if (cancelled) return;
          setState("ready");
          if (showTraffic && window.mappls && !trafficOnRef.current) {
            window.mappls.traffic({ map });
            trafficOnRef.current = true;
          }
        });

        map.addListener("click", (e) => {
          const ll = e?.latlng;
          if (ll && onLocationPick) onLocationPick(ll.lat, ll.lng);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState("unavailable");
          setDetail("Mappls SDK could not load — check domain whitelist in Mappls Console");
        }
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
      trafficOnRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || state !== "ready") return;
    map.setCenter?.([lat, lon]);
    map.setZoom?.(zoom);
  }, [lat, lon, zoom, state]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || state !== "ready" || !showTraffic || !window.mappls || trafficOnRef.current) return;
    window.mappls.traffic({ map });
    trafficOnRef.current = true;
  }, [showTraffic, state]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        id={containerId.current}
        className="h-full w-full overflow-hidden rounded-lg border border-line bg-panel"
      />
      {state === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-body/60 text-xs text-ink-dim">
          Loading Mappls India map…
        </div>
      )}
      {state === "unavailable" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-body/80 p-4 text-center text-xs text-amber-400/90">
          {detail ?? "Mappls unavailable"}
        </div>
      )}
      {state === "ready" && showTraffic && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-body/85 px-2 py-1 text-[10px] text-emerald-400/90 backdrop-blur">
          Mappls live traffic · India
        </div>
      )}
    </div>
  );
}
