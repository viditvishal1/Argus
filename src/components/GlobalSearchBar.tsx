"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function GlobalSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className="relative w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search everything — news, CVEs, launches, repos, filings…"
        aria-label="Global search"
        className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
      />
    </form>
  );
}
