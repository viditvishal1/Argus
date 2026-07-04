"use client";

// Knowledge Graph Explorer — cross-module entity search, type filter,
// force-directed visualization, and per-entity neighborhood + source items.

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Network } from "lucide-react";
import type { GraphEdge, GraphEntity, Item } from "@/lib/types";
import { ForceGraph } from "@/components/ForceGraph";
import { ItemCard } from "@/components/ModuleView";
import { ReaderPane } from "@/components/ReaderPane";

const TYPES = ["all", "organization", "location", "event", "technology", "repository", "satellite", "vessel", "aircraft", "instrument"];

interface Snapshot {
  entities: GraphEntity[];
  edges: GraphEdge[];
  totals: { entities: number; edges: number };
}

interface Neighborhood {
  center: GraphEntity;
  entities: GraphEntity[];
  edges: GraphEdge[];
  items: Item[];
}

function GraphInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const entityParam = sp.get("entity");

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [hood, setHood] = useState<Neighborhood | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const loadSnapshot = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (type !== "all") p.set("type", type);
    fetch(`/api/graph?${p.toString()}`)
      .then((r) => r.json())
      .then(setSnap)
      .finally(() => setLoading(false));
  }, [q, type]);

  useEffect(() => { if (!entityParam) loadSnapshot(); }, [entityParam, loadSnapshot]);

  useEffect(() => {
    if (!entityParam) { setHood(null); return; }
    setLoading(true);
    setSelectedItem(null);
    fetch(`/api/entity?id=${encodeURIComponent(entityParam)}`)
      .then((r) => r.json())
      .then((d) => setHood(d.center ? d : null))
      .finally(() => setLoading(false));
  }, [entityParam]);

  const openEntity = (id: string) => router.push(`/graph?entity=${encodeURIComponent(id)}`);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 flex items-center gap-2 text-lg font-semibold text-ink">
          <Network className="h-5 w-5 text-fuchsia-400" /> Knowledge Graph
        </h1>
        {hood ? (
          <button onClick={() => router.push("/graph")} className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-dim hover:text-ink">
            ← Back to full graph
          </button>
        ) : (
          <>
            <form onSubmit={(e) => { e.preventDefault(); loadSnapshot(); }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entities…"
                className="w-48 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none" />
            </form>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-line bg-panel px-2 py-1.5 text-xs text-ink-dim focus:outline-none">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </>
        )}
        {snap && !hood && (
          <span className="ml-auto text-[11px] text-ink-dim">
            {snap.totals.entities.toLocaleString()} entities · {snap.totals.edges.toLocaleString()} edges (top {snap.entities.length} shown)
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-ink-dim">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Building graph from connector data…
        </div>
      )}

      {!loading && hood && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <div className="mb-2 rounded-lg border border-line bg-panel p-3">
              <div className="text-[11px] uppercase tracking-wide text-ink-dim">{hood.center.type}</div>
              <div className="text-lg font-semibold text-ink">{hood.center.name}</div>
              <div className="mt-0.5 text-xs text-ink-dim">
                degree {hood.center.degree} · seen in: {hood.center.modules.join(", ")} · first {new Date(hood.center.firstSeen).toLocaleDateString()}
              </div>
            </div>
            <ForceGraph entities={hood.entities} edges={hood.edges} onSelect={openEntity} height={420} />
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedItem ? (
              <ReaderPane item={selectedItem} onClose={() => setSelectedItem(null)} />
            ) : (
              <>
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-dim">
                  Items referencing this entity ({hood.items.length})
                </h2>
                <div className="flex flex-col gap-1.5">
                  {hood.items.map((it) => (
                    <ItemCard key={it.id} item={it} selected={false} onSelect={() => setSelectedItem(it)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!loading && !hood && snap && (
        <>
          <ForceGraph entities={snap.entities} edges={snap.edges} onSelect={openEntity} height={560} />
          <p className="mt-2 text-[11px] text-ink-dim">
            Node size = connection degree · colors = entity type · click any node to explore its neighborhood.
            Entities are extracted automatically from every module’s live feed.
          </p>
        </>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="py-10 text-sm text-ink-dim">Loading…</div>}>
      <GraphInner />
    </Suspense>
  );
}
