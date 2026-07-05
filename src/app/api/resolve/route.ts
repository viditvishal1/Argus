import { NextRequest, NextResponse } from "next/server";
import { resolveFromQuery } from "@/lib/entity/resolution";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/resolve");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const resolved = resolveFromQuery(q);
  if (!resolved) {
    return NextResponse.json({ resolved: false, q, suggestion: `/search?q=${encodeURIComponent(q)}` });
  }

  return NextResponse.json({
    resolved: true,
    entity: resolved,
    entityPath: `/entity/${encodeURIComponent(resolved.id!)}`,
  });
}
