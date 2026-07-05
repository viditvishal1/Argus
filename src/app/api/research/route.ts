import { NextRequest, NextResponse } from "next/server";
import { groundedResearch } from "@/lib/research/grounded";
import { checkRateLimit, clientKey, LIMITS } from "@/lib/security/rate-limit";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/research");
  const rl = await checkRateLimit({ key: `research:${clientKey(req)}`, ...LIMITS.analyst });
  if (!rl.allowed) return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  try {
    const result = await groundedResearch(q);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      query: q,
      answer: null,
      citations: [],
      confidence: "insufficient",
      inferenceLabel: "",
      error: err instanceof Error ? err.message : "research failed",
    }, { status: 502 });
  }
}
