"use client";

import { useEffect, useState } from "react";
import { Database } from "lucide-react";

interface SourceRow {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  priority: number;
  geographic_scope?: string;
  reliability_score: number;
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<SourceRow[]>([]);

  useEffect(() => {
    fetch("/api/config/sources").then((r) => r.json()).then((d) => setSources(d.sources ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 flex items-center gap-2 text-lg font-semibold text-ink">
        <Database className="h-5 w-5 text-accent" /> Source configuration
      </h1>
      <p className="mb-4 text-xs text-ink-dim">
        Read-only view of configured data sources. Enable/disable via Supabase <code className="mono">data_sources</code> table or seed endpoint.
      </p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-panel text-[11px] uppercase text-ink-dim">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Scope</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Reliability</th>
              <th className="px-3 py-2">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="mono px-3 py-2 text-ink-dim">{s.id}</td>
                <td className="px-3 py-2 text-ink">{s.name}</td>
                <td className="px-3 py-2 text-ink-dim">{s.provider}</td>
                <td className="px-3 py-2 text-ink-dim">{s.geographic_scope ?? "—"}</td>
                <td className="mono px-3 py-2">{s.priority}</td>
                <td className="mono px-3 py-2">{(s.reliability_score * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">{s.enabled ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
