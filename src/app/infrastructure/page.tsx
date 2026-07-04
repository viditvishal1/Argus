"use client";

// Infrastructure Monitor — status board for the platforms much of the
// internet depends on, plus the live incident feed underneath.

import { useEffect, useState } from "react";
import { ModuleView, timeAgo } from "@/components/ModuleView";

interface PlatformStatus {
  name: string; kind: string; indicator: string; description: string;
  url: string; fetchedAt: string;
}

const TONE: Record<string, string> = {
  none: "border-emerald-900 bg-emerald-950/30 text-emerald-300",
  minor: "border-amber-900 bg-amber-950/30 text-amber-300",
  major: "border-orange-900 bg-orange-950/30 text-orange-300",
  critical: "border-red-900 bg-red-950/30 text-red-300",
  maintenance: "border-sky-900 bg-sky-950/30 text-sky-300",
};

function StatusBoard() {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [at, setAt] = useState<string>();
  useEffect(() => {
    const load = () =>
      fetch("/api/status").then((r) => r.json()).then((d) => {
        setPlatforms(d.platforms ?? []);
        setAt(d.fetchedAt);
      });
    load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-dim">
        <span className="uppercase tracking-wide">Platform health</span>
        {at && <span>checked {timeAgo(at)}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {platforms.map((p) => (
          <a key={p.name} href={p.url} target="_blank" rel="noreferrer"
            className={`rounded-lg border p-2.5 text-xs transition-opacity hover:opacity-80 ${TONE[p.indicator] ?? TONE.none}`}>
            <div className="font-medium">{p.name}</div>
            <div className="mt-0.5 truncate opacity-80">{p.description}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide opacity-60">{p.kind}</div>
          </a>
        ))}
        {platforms.length === 0 && <div className="col-span-full py-4 text-xs text-ink-dim">Checking status pages…</div>}
      </div>
    </div>
  );
}

export default function InfrastructurePage() {
  return (
    <ModuleView
      module="infrastructure"
      title="Infrastructure Monitor"
      subtitle="Internet & platform health via public status APIs — unresolved incidents feed below"
      extraHeader={<StatusBoard />}
      refreshSeconds={300}
    />
  );
}
