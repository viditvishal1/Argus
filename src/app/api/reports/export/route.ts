import { NextRequest, NextResponse } from "next/server";
import { groundedResearch } from "@/lib/research/grounded";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await trackApiRequest("/api/reports/export");
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "EarthOS Investigation Report");
  const query = String(body.query ?? body.hypothesis ?? "").trim();

  if (!query) return NextResponse.json({ error: "query or hypothesis required" }, { status: 400 });

  const research = await groundedResearch(query);
  const markdown = [
    `# ${title}`,
    "",
    `_Generated ${new Date().toISOString()}_`,
    "",
    "## Summary",
    "",
    research.answer ?? "_Insufficient sources for synthesis._",
    "",
    "## Confidence",
    "",
    research.confidence,
    "",
    "## Citations",
    "",
    ...research.citations.map((c) =>
      `${c.index}. **${c.title}** — ${c.publisher} (${c.observedAt})${c.url ? ` [link](${c.url})` : ""}`,
    ),
    "",
    "---",
    research.inferenceLabel,
  ].join("\n");

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="earthos-report-${Date.now()}.md"`,
    },
  });
}
