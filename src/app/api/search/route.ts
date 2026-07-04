// Global search — runs all module connectors, keyword-matches across the
// normalized items, augments with query-based sources (Google News, data.gov),
// and optionally adds an AI briefing over the top results.

import { NextRequest, NextResponse } from "next/server";
import {
  MODULE_CONNECTORS,
  runConnectors,
  searchGoogleNews,
  searchDataGov,
} from "@/lib/connectors";
import { aiEnabled, writeBriefing } from "@/lib/ai";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

function matches(item: Item, terms: string[]): boolean {
  const hay = `${item.title} ${item.summary ?? ""} ${item.tags.join(" ")} ${item.source} ${item.entities.map((e) => e.name).join(" ")}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const withAi = req.nextUrl.searchParams.get("briefing") === "1";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

  const allIds = Object.values(MODULE_CONNECTORS).flat();
  const [cached, gnews, datasets] = await Promise.all([
    runConnectors(allIds),
    searchGoogleNews(q).catch(() => []),
    searchDataGov(q).catch(() => []),
  ]);

  const matched = cached.filter((it) => matches(it, terms));
  const merged = [...matched, ...gnews, ...datasets];

  const grouped: Record<string, Item[]> = {};
  for (const it of merged) (grouped[it.module] ??= []).push(it);
  for (const k of Object.keys(grouped)) grouped[k] = grouped[k].slice(0, 12);

  let briefing: string | null = null;
  let briefingError: string | null = null;
  if (withAi && merged.length > 0) {
    if (aiEnabled()) {
      try {
        briefing = await writeBriefing(merged);
      } catch (err) {
        briefingError = err instanceof Error ? err.message : "AI briefing failed";
      }
    } else {
      briefingError = "Set GEMINI_API_KEY to enable AI briefings";
    }
  }

  return NextResponse.json({
    q,
    grouped,
    total: merged.length,
    briefing,
    briefingError,
    aiEnabled: aiEnabled(),
    fetchedAt: new Date().toISOString(),
  });
}
