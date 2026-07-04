"use client";

// Dashboard — daily-return flow (PRD Flow E): live posture across modules,
// then jump into any module for depth.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowRight } from "lucide-react";
import { MODULES } from "@/lib/modules";
import type { Item } from "@/lib/types";
import { ItemCard, timeAgo } from "@/components/ModuleView";
import { ReaderPane } from "@/components/ReaderPane";

interface Stats {
  quakes24h?: number;
  maxMag?: number;
  criticalCves?: number;
  kevNew?: number;
  kp?: number;
  incidents?: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [latest, setLatest] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>();

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/modules/earth").then((r) => r.json()),
      fetch("/api/modules/cyber").then((r) => r.json()),
      fetch("/api/kindex").then((r) => r.json()),
      fetch("/api/modules/infrastructure").then((r) => r.json()),
      fetch("/api/modules/news").then((r) => r.json()),
    ]).then(([earth, cyber, kp, infra, news]) => {
      const s: Stats = {};
      const feed: Item[] = [];
      if (earth.status === "fulfilled" && earth.value.items) {
        const quakes = (earth.value.items as Item[]).filter((i) => i.tags.includes("earthquake"));
        s.quakes24h = quakes.length;
        s.maxMag = quakes.reduce((m, q) => Math.max(m, q.severity ?? 0), 0);
        feed.push(...quakes.filter((q) => (q.severity ?? 0) >= 4.5).slice(0, 4));
      }
      if (cyber.status === "fulfilled" && cyber.value.items) {
        const items = cyber.value.items as Item[];
        s.criticalCves = items.filter((i) => (i.severity ?? 0) >= 9).length;
        s.kevNew = items.filter((i) => i.tags.includes("kev")).length;
        feed.push(...items.filter((i) => (i.severity ?? 0) >= 9).slice(0, 4));
      }
      if (kp.status === "fulfilled" && typeof kp.value.kp === "number") s.kp = kp.value.kp;
      if (infra.status === "fulfilled" && infra.value.items) {
        s.incidents = (infra.value.items as Item[]).length;
        feed.push(...(infra.value.items as Item[]).slice(0, 3));
      }
      if (news.status === "fulfilled" && news.value.items) {
        feed.push(...(news.value.items as Item[]).slice(0, 8));
        setFetchedAt(news.value.fetchedAt);
      }
      setStats(s);
      setLatest(feed.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });
  }, []);

  const stat = (label: string, value: React.ReactNode, href: string, tone?: string) => (
    <Link href={href} className="rounded-lg border border-line bg-panel p-3 hover:bg-panel-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-dim">{label}</div>
      <div className={`mono mt-1 text-xl font-semibold ${tone ?? "text-ink"}`}>{value ?? "—"}</div>
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink">
          Mission control <span className="text-ink-dim">· open intelligence on public data</span>
        </h1>
        <p className="mt-1 text-xs text-ink-dim">
          {fetchedAt ? `Feeds updated ${timeAgo(fetchedAt)} · ` : ""}search anything above, or open a module.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stat("Earthquakes · 24h", stats.quakes24h, "/earth")}
        {stat("Max magnitude", stats.maxMag?.toFixed(1), "/earth", (stats.maxMag ?? 0) >= 6 ? "text-orange-400" : undefined)}
        {stat("Critical CVEs · 7d", stats.criticalCves, "/cyber", (stats.criticalCves ?? 0) > 0 ? "text-red-400" : undefined)}
        {stat("Geomagnetic Kp", stats.kp?.toFixed(1), "/space", (stats.kp ?? 0) >= 5 ? "text-violet-400" : undefined)}
        {stat("Platform incidents", stats.incidents, "/infrastructure", (stats.incidents ?? 0) > 0 ? "text-amber-400" : undefined)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
            <Activity className="h-4 w-4 text-accent" /> Cross-module feed
          </h2>
          <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {latest.length === 0 && <div className="py-8 text-xs text-ink-dim">Warming up connectors…</div>}
            {latest.map((it) => (
              <ItemCard key={it.id} item={it} selected={selected?.id === it.id} onSelect={() => setSelected(it)} />
            ))}
          </div>
        </section>

        <section>
          {selected ? (
            <div className="max-h-[60vh]">
              <ReaderPane item={selected} onClose={() => setSelected(null)} />
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-sm font-medium text-ink">Modules</h2>
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                {MODULES.map((m) => (
                  <Link key={m.id} href={m.path}
                    className="group rounded-lg border border-line bg-panel p-3 transition-colors hover:bg-panel-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-ink">{m.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-dim">{m.description}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
