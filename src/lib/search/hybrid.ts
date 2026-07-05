// Hybrid search — indexed data first, live connectors only as supplement.

import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { indexedSearch, hitsToItems } from "@/lib/search/opensearch";
import { MODULE_CONNECTORS, runConnector, searchGoogleNews, searchDataGov } from "@/lib/connectors";
import type { Item } from "@/lib/types";

function withBudget<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function matches(item: Item, terms: string[]): boolean {
  const hay = `${item.title} ${item.summary ?? ""} ${item.tags.join(" ")}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export async function hybridSearch(q: string, opts?: { limit?: number; liveFallback?: boolean }): Promise<{
  items: Item[];
  sources: { indexed: number; live: number; mode: string };
}> {
  const limit = opts?.limit ?? 48;
  const hybrid = await isFeatureEnabled("hybrid_search");
  const allowLive = opts?.liveFallback === true;

  const hits = await indexedSearch(q, limit);
  const indexedItems = hitsToItems(hits);

  if (hybrid && hits.length >= 3) {
    return {
      items: indexedItems.slice(0, limit),
      sources: { indexed: hits.length, live: 0, mode: "indexed" },
    };
  }

  if (!allowLive) {
    return {
      items: indexedItems.slice(0, limit),
      sources: { indexed: hits.length, live: 0, mode: hits.length > 0 ? "indexed_partial" : "indexed_empty" },
    };
  }

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const tickerLike = /^[\^]?[A-Z]{1,5}$/.test(q.trim());
  const connectorIds = tickerLike
    ? [...(MODULE_CONNECTORS.markets ?? []), ...(MODULE_CONNECTORS.news ?? [])]
    : Object.values(MODULE_CONNECTORS).flat().slice(0, 12);

  const [indexed, liveGroups, gnews, datasets] = await Promise.all([
    indexedSearch(q, Math.floor(limit / 2)),
    Promise.all(connectorIds.map((id) => withBudget(runConnector(id), 3000, [] as Item[]))),
    withBudget(searchGoogleNews(q), 4000, []),
    withBudget(searchDataGov(q), 4000, []),
  ]);

  const indexedFromLive = hitsToItems(indexed);
  const seen = new Set(indexedFromLive.map((i) => i.id));
  const liveMatched = liveGroups.flat().filter((it) => matches(it, terms) && !seen.has(it.id));
  for (const it of liveMatched) seen.add(it.id);
  const extras = [...gnews, ...datasets].filter((it) => !seen.has(it.id));

  const merged = [...indexedFromLive, ...liveMatched, ...extras].slice(0, limit);
  return {
    items: merged,
    sources: {
      indexed: indexed.length,
      live: liveMatched.length + extras.length,
      mode: hybrid ? "hybrid" : "live",
    },
  };
}
