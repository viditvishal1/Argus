// Global search — runs all module connectors with a hard per-connector time
// budget (slow sources keep loading in the background and hit the cache next
// time, they never block the response), keyword-matches across the normalized
// items, and augments with query-based sources (Google News, data.gov).
// The AI briefing is requested separately by the client (mode=briefing) so
// result rendering is never gated on the LLM call.

import { NextRequest, NextResponse } from "next/server";
import {
  MODULE_CONNECTORS,
  runConnector,
  searchGoogleNews,
  searchDataGov,
} from "@/lib/connectors";
import { aiEnabled, writeBriefing } from "@/lib/ai";
import type { Item } from "@/lib/types";
import { checkRateLimit, clientKey, LIMITS } from "@/lib/security/rate-limit";
import { trackApiRequest } from "@/lib/usage/tracker";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { dbEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";

function withBudget<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function matches(item: Item, terms: string[]): boolean {
  const hay = `${item.title} ${item.summary ?? ""} ${item.tags.join(" ")} ${item.source} ${item.entities.map((e) => e.name).join(" ")}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

async function gatherMatches(q: string): Promise<Item[]> {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

  // Phase 2: query OpenSearch / ingested_items first when hybrid_search enabled
  const hybrid = await isFeatureEnabled("hybrid_search");
  if (hybrid && dbEnabled()) {
    // Placeholder — indexed search wired in Phase 2
  }

  // Limit connector fan-out: prioritize news + markets + relevant modules by query shape
  const tickerLike = /^[\^]?[A-Z]{1,5}$/.test(q.trim());
  const allIds = tickerLike
    ? [...(MODULE_CONNECTORS.markets ?? []), ...(MODULE_CONNECTORS.news ?? [])]
    : Object.values(MODULE_CONNECTORS).flat().slice(0, 20);

  const [cachedGroups, gnews, datasets] = await Promise.all([
    Promise.all(allIds.map((id) => withBudget(runConnector(id), 4000, [] as Item[]))),
    withBudget(searchGoogleNews(q), 5000, []),
    withBudget(searchDataGov(q), 5000, []),
  ]);
  const matched = cachedGroups.flat().filter((it) => matches(it, terms));
  return [...matched, ...gnews, ...datasets];
}

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/search");
  const rl = await checkRateLimit({ key: `search:${clientKey(req)}`, ...LIMITS.search });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded", retryAfterMs: rl.resetAt - Date.now() }, { status: 429 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const mode = req.nextUrl.searchParams.get("mode") ?? "results";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const merged = await gatherMatches(q);

  if (mode === "briefing") {
    if (!aiEnabled()) {
      return NextResponse.json({ briefing: null, briefingError: "Set GEMINI_API_KEY to enable AI briefings" });
    }
    if (merged.length === 0) return NextResponse.json({ briefing: null, briefingError: null });
    try {
      return NextResponse.json({ briefing: await writeBriefing(merged), briefingError: null });
    } catch (err) {
      return NextResponse.json({
        briefing: null,
        briefingError: err instanceof Error ? err.message : "AI briefing failed",
      });
    }
  }

  const grouped: Record<string, Item[]> = {};
  for (const it of merged) (grouped[it.module] ??= []).push(it);
  for (const k of Object.keys(grouped)) grouped[k] = grouped[k].slice(0, 12);

  return NextResponse.json({
    q,
    grouped,
    total: merged.length,
    aiEnabled: aiEnabled(),
    fetchedAt: new Date().toISOString(),
  });
}
