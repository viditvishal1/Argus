import Link from "next/link";
import { FINDINGS_METHODOLOGY_VERSION } from "@/lib/intelligence/findings";
import { CII_METHODOLOGY_VERSION } from "@/lib/intelligence/cii/v1";

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-ink">Methodology & provenance</h1>
        <p className="mt-1 text-sm text-ink-dim">
          How Argus scores, detects signals, and labels uncertainty — transparent by design.
        </p>
      </div>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-ink">Country Instability Index ({CII_METHODOLOGY_VERSION})</h2>
        <p className="mt-2 text-sm text-ink-dim">
          CII is a weighted composite from conflict, unrest, cyber, disaster, and convergence components
          scoped to country bounding boxes. Scores 0–100 map to bands: low, elevated, high, critical.
          Countries with insufficient evidence return <code className="mono text-xs">insufficient_data</code>.
        </p>
        <p className="mt-2 text-sm text-ink-dim">
          This is not CII v8 parity — methodology is versioned and evidence-backed per country brief.
        </p>
        <Link href="/country/ua" className="mt-3 inline-block text-sm text-accent hover:underline">
          Example: Ukraine country brief →
        </Link>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-ink">Cross-domain findings ({FINDINGS_METHODOLOGY_VERSION})</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-dim">
          <li>Convergence — multiple modules reporting in the same region</li>
          <li>Conflict escalation — high-severity conflict module cluster</li>
          <li>Cyber KEV — CISA known-exploited vulnerabilities in feed</li>
          <li>Natural hazard — significant earthquakes (USGS)</li>
          <li>Maritime chokepoint — AIS density near Suez, Hormuz, Malacca, Panama</li>
          <li>Aviation disruption — delays, cancellations, high-severity notices</li>
          <li>Infrastructure cascade — correlated platform/outage signals</li>
        </ul>
        <p className="mt-3 text-sm text-ink-dim">
          Each finding includes up to 8 evidence items with source URLs. Confidence is heuristic, not a probability.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-ink">Alert engine</h2>
        <p className="mt-2 text-sm text-ink-dim">
          Rules evaluate on every ingest path (connectors, workers, queue). Matches are deduplicated for 15 minutes
          per rule+item. Saved searches automatically become keyword alert rules. Delivery: in-app SSE notifications
          and optional Markdown digest export.
        </p>
        <Link href="/settings" className="mt-3 inline-block text-sm text-accent hover:underline">
          Configure rules in Settings →
        </Link>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-ink">Freshness & stale data</h2>
        <p className="mt-2 text-sm text-ink-dim">
          The freshness badge reflects provider seed timestamps and cache age. Stale layers continue to render
          last-known-good data with explicit stale labels — Argus does not fabricate live positions when APIs fail.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-ink">AI analyst</h2>
        <p className="mt-2 text-sm text-ink-dim">
          Local-first chain: Ollama → LM Studio → Gemini → retrieval-only extractive fallback.
          Without any API keys, analyst mode returns cited excerpts only.
        </p>
      </section>
    </div>
  );
}
