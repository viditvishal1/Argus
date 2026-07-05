// AI Analyst — retrieval-grounded Q&A using hybrid search (indexed first).

import { NextRequest, NextResponse } from "next/server";
import { aiEnabled, askAnalyst } from "@/lib/ai";
import { hybridSearch } from "@/lib/search/hybrid";
import { checkRateLimit, clientKey, LIMITS } from "@/lib/security/rate-limit";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await trackApiRequest("/api/analyst");
  const rl = await checkRateLimit({ key: `analyst:${clientKey(req)}`, ...LIMITS.analyst });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  if (!aiEnabled()) {
    return NextResponse.json(
      { error: "AI Analyst is not configured. Add GEMINI_API_KEY to .env.local and restart." },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const question = String(body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const { items, sources } = await hybridSearch(question, { limit: 40, liveFallback: body.liveFallback === true });
  if (items.length === 0) {
    return NextResponse.json({
      answer: "No indexed or live sources matched this query. Try again after background ingestion runs.",
      sources: [],
      searchMeta: sources,
    });
  }

  try {
    const { answer, sources: cited } = await askAnalyst(question, items);
    return NextResponse.json({
      answer,
      sources: cited,
      searchMeta: sources,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI call failed" },
      { status: 502 },
    );
  }
}
