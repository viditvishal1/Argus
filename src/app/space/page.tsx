"use client";

// Space — ISS live position, geomagnetic K-index, upcoming launches,
// recently launched satellites, space-weather bulletins.

import { useEffect, useState } from "react";
import { Satellite } from "lucide-react";
import { ModuleView } from "@/components/ModuleView";

function LiveStats() {
  const [iss, setIss] = useState<{ lat: number; lon: number; altitudeKm?: number; velocityKmh?: number } | null>(null);
  const [kp, setKp] = useState<number | null>(null);

  useEffect(() => {
    const load = () => {
      fetch("/api/iss").then((r) => r.json()).then((d) => typeof d.lat === "number" && setIss(d));
      fetch("/api/kindex").then((r) => r.json()).then((d) => typeof d.kp === "number" && setKp(d.kp));
    };
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  const kpTone = (kp ?? 0) >= 7 ? "text-red-400" : (kp ?? 0) >= 5 ? "text-orange-400" : "text-violet-300";

  return (
    <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-lg border border-line bg-panel p-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-dim">
          <Satellite className="h-3 w-3" /> ISS position
        </div>
        <div className="mono mt-1 text-sm text-ink">
          {iss ? `${iss.lat.toFixed(2)}°, ${iss.lon.toFixed(2)}°` : "—"}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-panel p-3">
        <div className="text-[11px] uppercase tracking-wide text-ink-dim">ISS altitude / speed</div>
        <div className="mono mt-1 text-sm text-ink">
          {iss?.altitudeKm != null ? `${iss.altitudeKm.toFixed(0)} km · ${iss.velocityKmh?.toFixed(0)} km/h` : "—"}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-panel p-3">
        <div className="text-[11px] uppercase tracking-wide text-ink-dim">Planetary K-index</div>
        <div className={`mono mt-1 text-xl font-semibold ${kpTone}`}>{kp?.toFixed(1) ?? "—"}</div>
      </div>
      <div className="rounded-lg border border-line bg-panel p-3">
        <div className="text-[11px] uppercase tracking-wide text-ink-dim">Geomagnetic state</div>
        <div className={`mt-1 text-sm ${kpTone}`}>
          {kp == null ? "—" : kp >= 7 ? "Strong storm" : kp >= 5 ? "Minor storm" : kp >= 4 ? "Active" : "Quiet"}
        </div>
      </div>
    </div>
  );
}

export default function SpacePage() {
  return (
    <ModuleView
      module="space"
      title="Space"
      subtitle="Launches (Launch Library 2), space weather (NOAA SWPC), new satellites (CelesTrak)"
      extraHeader={<LiveStats />}
      refreshSeconds={600}
    />
  );
}
