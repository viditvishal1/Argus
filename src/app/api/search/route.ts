import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/lib/search/hybrid";
import { aiEnabled, writeBriefing } from "@/lib/ai";
import { checkRateLimit, clientKey, LIMITS } from "@/lib/security/rate-limit";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/search");
  const rl = await checkRateLimit({ key: `search:${clientKey(req)}`, ...LIMITS.search });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const mode = req.nextUrl.searchParams.get("mode") ?? "results";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const { items: merged, sources } = await hybridSearch(q);

  if (mode === "briefing") {
    if (!aiEnabled()) {
      return NextResponse.json({ briefing: null, briefingError: "Set GEMINI_API_KEY to enable AI briefings" });
    }
    if (merged.length === 0) return NextResponse.json({ briefing: null, briefingError: null });
    try {
      return NextResponse.json({ briefing: await writeBriefing(merged), briefingError: null, searchMeta: sources });
    } catch (err) {
      return NextResponse.json({
        briefing: null,
        briefingError: err instanceof Error ? err.message : "AI briefing failed",
      });
    }
  }

  const grouped: Record<string, typeof merged> = {};
  for (const it of merged) (grouped[it.module] ??= []).push(it);
  for (const k of Object.keys(grouped)) grouped[k] = grouped[k].slice(0, 12);

  return NextResponse.json({
    q,
    grouped,
    total: merged.length,
    aiEnabled: aiEnabled(),
    searchMeta: sources,
    fetchedAt: new Date().toISOString(),
  });
}
