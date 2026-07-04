"use client";

// Extra header for the Government module: on-demand data.gov catalog search.

import { useState } from "react";
import { Database, LoaderCircle } from "lucide-react";
import type { Item } from "@/lib/types";

export function GovernmentExtras() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const d = await fetch(`/api/datagov?q=${encodeURIComponent(q.trim())}`).then((r) => r.json());
      setResults(d.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-3 rounded-lg border border-line bg-panel p-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); search(); }}
      >
        <Database className="h-4 w-4 shrink-0 text-ink-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the data.gov open-data catalog (e.g. 'air quality', 'crime')…"
          className="w-full rounded-md border border-line bg-panel-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
        />
        <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-dim hover:text-ink">
          {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Search"}
        </button>
      </form>
      {results && (
        <div className="mt-2 max-h-48 overflow-y-auto">
          {results.length === 0 && <div className="py-2 text-xs text-ink-dim">No datasets found.</div>}
          {results.map((r) => (
            <a key={r.id} href={r.url} target="_blank" rel="noreferrer"
              className="block rounded px-2 py-1.5 hover:bg-panel-2">
              <div className="text-xs font-medium text-ink">{r.title}</div>
              <div className="line-clamp-1 text-[11px] text-ink-dim">{r.source}{r.summary ? ` — ${r.summary}` : ""}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
