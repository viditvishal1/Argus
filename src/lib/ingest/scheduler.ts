// Background ingestion scheduler — runs enabled connectors by priority.

import { getEnabledSources } from "@/lib/config/sources";
import { connectors, runConnector } from "@/lib/connectors/framework";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { shouldCollectAtQuota, quotaLevelFromUsage } from "@/lib/storage/retention";
import { getUsageSnapshot } from "@/lib/usage/tracker";

export interface IngestRunResult {
  sourceId: string;
  itemCount: number;
  ok: boolean;
  error?: string;
}

export async function runScheduledIngestion(opts?: {
  maxSources?: number;
  moduleFilter?: string;
}): Promise<{ ran: number; results: IngestRunResult[]; quotaLevel: string }> {
  const enabled = await isFeatureEnabled("background_ingestion");
  if (!enabled) {
    return { ran: 0, results: [], quotaLevel: "background_disabled" };
  }

  const usage = await getUsageSnapshot();
  const quotaLevel = usage.quotaLevel ?? "normal";
  const level = quotaLevelFromUsage(usage.supabaseUsagePct ?? 0);

  const sources = await getEnabledSources();
  let candidates = sources
    .filter((s) => connectors.has(s.id))
    .filter((s) => shouldCollectAtQuota(s.priority, level))
    .sort((a, b) => b.priority - a.priority);

  if (opts?.moduleFilter) {
    const mod = opts.moduleFilter;
    candidates = candidates.filter((s) => {
      const c = connectors.get(s.id);
      return c?.manifest.module === mod;
    });
  }

  const max = opts?.maxSources ?? 12;
  const batch = candidates.slice(0, max);
  const results: IngestRunResult[] = [];

  for (const src of batch) {
    try {
      const items = await runConnector(src.id);
      results.push({ sourceId: src.id, itemCount: items.length, ok: true });
    } catch (err) {
      results.push({
        sourceId: src.id,
        itemCount: 0,
        ok: false,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  return { ran: results.length, results, quotaLevel };
}
