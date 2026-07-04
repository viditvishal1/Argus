// AI Analyst — natural-language cross-module Q&A. Retrieval-grounded: we run
// the connectors for the scoped modules, keyword-rank the items against the
// question, and hand only those to Gemini with a citation requirement.

import { NextRequest, NextResponse } from "next/server";
import { MODULE_CONNECTORS, runConnectorsWithBudget, searchGoogleNews } from "@/lib/connectors";
import { aiEnabled, askAnalyst } from "@/lib/ai";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

function rank(items: Item[], question: string): Item[] {
  const terms = question
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
  const scored = items.map((it) => {
    const hay = `${it.title} ${it.summary ?? ""} ${it.tags.join(" ")} ${it.entities
      .map((e) => e.name)
      .join(" ")}`.toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    return { it, score };
  });
  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  // If keyword overlap is thin, fall back to the most recent items so the
  // analyst can still summarize "what's happening".
  const pool = hits.length >= 8 ? hits : scored.sort((a, b) => b.score - a.score);
  return pool.slice(0, 40).map((s) => s.it);
}

export async function POST(req: NextRequest) {
  if (!aiEnabled()) {
    return NextResponse.json(
      { error: "AI Analyst is not configured. Add GEMINI_API_KEY to .env.local and restart." },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const question = String(body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const scope: string[] =
    Array.isArray(body.modules) && body.modules.length > 0
      ? body.modules.filter((m: string) => MODULE_CONNECTORS[m])
      : Object.keys(MODULE_CONNECTORS);

  const ids = scope.flatMap((m) => MODULE_CONNECTORS[m]);
  const [cached, fresh] = await Promise.all([
    runConnectorsWithBudget(ids, 6000),
    searchGoogleNews(question).catch(() => [] as Item[]),
  ]);
  const items = rank([...cached, ...fresh], question);
  if (items.length === 0) {
    return NextResponse.json({
      answer: "No source items are available for that query right now — connectors may still be warming up. Try again shortly or broaden the module scope.",
      sources: [],
    });
  }
  try {
    const { answer, sources } = await askAnalyst(question, items);
    return NextResponse.json({ answer, sources, model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI call failed" },
      { status: 502 },
    );
  }
}
