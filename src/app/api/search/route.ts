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
  const allIds = Object.values(MODULE_CONNECTORS).flat();
  const [cachedGroups, gnews, datasets] = await Promise.all([
    // 4s budget per connector: cached connectors return instantly; cold slow
    // ones (NVD, CourtListener) miss this response but warm the cache.
    Promise.all(allIds.map((id) => withBudget(runConnector(id), 4000, [] as Item[]))),
    withBudget(searchGoogleNews(q), 5000, []),
    withBudget(searchDataGov(q), 5000, []),
  ]);
  const matched = cachedGroups.flat().filter((it) => matches(it, terms));
  return [...matched, ...gnews, ...datasets];
}

export async function GET(req: NextRequest) {
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
