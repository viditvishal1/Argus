"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/Badge";
import type { Finding } from "@/lib/intelligence/findings";

const SIGNAL_LABELS: Record<string, string> = {
  convergence: "Convergence",
  conflict_escalation: "Conflict",
  cyber_kev: "Cyber KEV",
  natural_hazard: "Natural hazard",
  maritime_chokepoint: "Maritime chokepoint",
  aviation_disruption: "Aviation",
  infrastructure_cascade: "Infrastructure",
};

export function FindingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [strategicRisk, setStrategicRisk] = useState<
    { iso2: string; country: string; score: number; band: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/findings?limit=30")
      .then((r) => r.json())
      .then((d) => {
        setFindings(d.findings ?? []);
        setStrategicRisk(d.strategicRisk ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, refresh]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Cross-domain findings</h2>
            <p className="text-[10px] text-ink-dim">Evidence-backed signals · findings-v1</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/v1/alerts/digest?format=markdown"
              className="text-[10px] text-accent hover:underline"
              download
            >
              Export digest
            </a>
            <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {strategicRisk.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] uppercase tracking-wide text-ink-dim">Strategic risk strip</p>
              <div className="flex flex-wrap gap-2">
                {strategicRisk.map((c) => (
                  <Link
                    key={c.iso2}
                    href={`/country/${c.iso2.toLowerCase()}`}
                    className="rounded-md border border-line bg-panel-2 px-2 py-1 text-[11px] hover:border-accent"
                  >
                    <span className="font-medium text-ink">{c.country}</span>
                    <span className="ml-1.5 mono text-ink-dim">{c.score}</span>
                    <Badge tone={c.band === "critical" ? "critical" : "warning"}>
                      {c.band}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading && <p className="text-sm text-ink-dim">Loading findings…</p>}
          {!loading && findings.length === 0 && (
            <p className="text-sm text-ink-dim">No cross-domain findings in the current window.</p>
          )}

          <div className="space-y-3">
            {findings.map((f) => (
              <article key={f.id} className="rounded-lg border border-line/80 bg-panel-2/30 p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="info">{SIGNAL_LABELS[f.signalType] ?? f.signalType}</Badge>
                  <span className="text-[10px] text-ink-dim">
                    confidence {(f.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-ink">{f.title}</h3>
                <p className="mt-1 text-[11px] text-ink-dim">{f.summary}</p>
                {f.evidence.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-line/50 pt-2">
                    {f.evidence.slice(0, 4).map((e) => (
                      <li key={e.itemId} className="flex items-start gap-1.5 text-[10px]">
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-ink-dim" />
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            {e.title}
                          </a>
                        ) : (
                          <span className="text-ink">{e.title}</span>
                        )}
                        <span className="text-ink-dim">· {e.source}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>

        <div className="border-t border-line px-4 py-2 text-[10px] text-ink-dim">
          <Link href="/methodology" className="text-accent hover:underline">
            Methodology & scoring
          </Link>
        </div>
      </div>
    </div>
  );
}
