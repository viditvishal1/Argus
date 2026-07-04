import { NextRequest, NextResponse } from "next/server";
import { fetchReadme } from "@/lib/connectors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get("repo");
  if (!repo) return NextResponse.json({ error: "repo required (owner/name)" }, { status: 400 });
  const markdown = await fetchReadme(repo);
  if (markdown === null) {
    return NextResponse.json({ error: "README not found or rate-limited" }, { status: 404 });
  }
  return NextResponse.json({ repo, markdown: markdown.slice(0, 60000) });
}
