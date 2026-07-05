"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const TICKER = /^[\^]?[A-Z]{1,5}$/;
const ICAO = /^[A-Z]{4}$/;
const MMSI = /^\d{9}$/;

function resolveLocal(q: string): string | null {
  const t = q.trim();
  if (TICKER.test(t)) return `/entity/instrument:${t.replace(/^\^/, "").toLowerCase()}`;
  if (ICAO.test(t)) return `/entity/airport:${t.toLowerCase()}`;
  if (MMSI.test(t)) return `/entity/vessel:mmsi:${t}`;
  return null;
}

export function GlobalSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    const entityPath = resolveLocal(trimmed);
    if (entityPath) {
      router.push(entityPath);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form className="relative w-full max-w-xl" onSubmit={submit} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tickers, ICAO, MMSI, companies, topics…"
        aria-label="Global search"
        className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
      />
    </form>
  );
}
