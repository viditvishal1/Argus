"use client";

import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { FindingsModal } from "@/components/FindingsModal";

export function FindingsBadge({ className }: { className?: string }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/v1/findings?limit=30")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => setCount(0));
  }, []);

  if (count === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-dim hover:text-ink ${className ?? ""}`}
          title="Cross-domain findings"
        >
          <Radar className="h-3 w-3" />
          Findings
        </button>
        <FindingsModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent hover:bg-accent/20 ${className ?? ""}`}
        title="Cross-domain findings"
      >
        <Radar className="h-3 w-3" />
        {count} findings
      </button>
      <FindingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
