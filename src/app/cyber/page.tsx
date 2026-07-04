"use client";

// Cyber Intelligence — CVE/KEV feed with a user-defined vendor/product
// watchlist (PRD Flow B): matching items are ring-highlighted in the feed.

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { ModuleView } from "@/components/ModuleView";
import { getWatchlist, setWatchlist } from "@/lib/saved";
import type { Item } from "@/lib/types";

function WatchlistEditor({ words, onChange }: { words: string[]; onChange: (w: string[]) => void }) {
  const [input, setInput] = useState("");
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel p-3">
      <Eye className="h-4 w-4 text-red-400" />
      <span className="text-xs text-ink-dim">Watchlist (vendor/product):</span>
      {words.map((w) => (
        <span key={w} className="flex items-center gap-1 rounded-full border border-red-900 bg-red-950/40 px-2 py-0.5 text-[11px] text-red-300">
          {w}
          <button onClick={() => onChange(words.filter((x) => x !== w))} aria-label={`Remove ${w}`} className="hover:text-white">×</button>
        </span>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const w = input.trim().toLowerCase();
          if (w && !words.includes(w)) onChange([...words, w]);
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="add e.g. cisco, wordpress…"
          className="w-40 rounded-md border border-line bg-panel-2 px-2 py-1 text-xs text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
        />
      </form>
      <span className="ml-auto text-[11px] text-ink-dim">matches are highlighted in the feed</span>
    </div>
  );
}

export default function CyberPage() {
  const [words, setWords] = useState<string[]>([]);
  useEffect(() => setWords(getWatchlist()), []);
  const update = (w: string[]) => { setWords(w); setWatchlist(w); };

  const highlight = (item: Item) => {
    if (words.length === 0) return false;
    const hay = `${item.title} ${item.summary ?? ""} ${item.entities.map((e) => e.name).join(" ")}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  };

  return (
    <ModuleView
      module="cyber"
      title="Cyber Intelligence"
      subtitle="NVD CVEs (last 7 days) + CISA Known Exploited Vulnerabilities — advisories readable in-app"
      extraHeader={<WatchlistEditor words={words} onChange={update} />}
      highlightFn={highlight}
      refreshSeconds={600}
    />
  );
}
