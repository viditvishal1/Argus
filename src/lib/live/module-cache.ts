import { MODULE_CONNECTORS, runConnectors } from "@/lib/connectors";
import { readLive, type LiveResult } from "@/lib/live/store";
import { writeSeedMeta } from "@/lib/live/seed-meta";
import type { Item } from "@/lib/types";

const MODULE_TTL: Record<string, number> = {
  markets: 120,
  aviation: 90,
  maritime: 90,
  news: 300,
  earth: 180,
  conflict: 600,
  cyber: 300,
  space: 300,
  macro: 3600,
  startup: 600,
  government: 600,
  infrastructure: 600,
};

export interface ModuleLiveResult extends LiveResult<Item[]> {
  module: string;
  fetchedAt: string;
}

/** Read-only module bundle from Redis (stale-while-revalidate). Never blocks on upstream when cached. */
export async function readModuleLive(module: string): Promise<ModuleLiveResult | null> {
  const ids = MODULE_CONNECTORS[module];
  if (!ids?.length) return null;

  const ttl = MODULE_TTL[module] ?? 300;
  const result = await readLive<Item[]>(
    `module:${module}`,
    async () => runConnectors(ids),
    {
      ttlSeconds: ttl,
      source: `connectors:${module}`,
      fallback: [],
      coldTimeoutMs: module === "markets" ? 12_000 : 6_000,
    },
  );

  if (result.data.length > 0 || result.updatedAt) {
    void writeSeedMeta(`module:${module}`, result.data.length, result.source);
  }

  return {
    ...result,
    module,
    fetchedAt: new Date().toISOString(),
  };
}

export async function seedModuleLive(module: string): Promise<number> {
  const ids = MODULE_CONNECTORS[module];
  if (!ids?.length) return -1;
  try {
    const items = await runConnectors(ids);
    const { seedLive } = await import("@/lib/live/store");
    await seedLive(`module:${module}`, items, `connectors:${module}`);
    await writeSeedMeta(`module:${module}`, items.length, `connectors:${module}`);
    return items.length;
  } catch {
    return -1;
  }
}
