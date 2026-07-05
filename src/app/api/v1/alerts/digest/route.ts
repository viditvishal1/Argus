import { NextRequest, NextResponse } from "next/server";
import { buildDigestFromItems } from "@/lib/alerts/digest";
import { readModuleLiveCached } from "@/lib/live/module-cache";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadItems(): Promise<Item[]> {
  const mods = await Promise.all(
    ["earth", "news", "conflict", "cyber", "aviation", "maritime", "infrastructure"].map((m) =>
      readModuleLiveCached(m),
    ),
  );
  return mods.flatMap((r) => r?.data ?? []);
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const items = await loadItems();
  const markdown = await buildDigestFromItems(items);

  if (format === "markdown" || format === "md") {
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="argus-digest-${Date.now()}.md"`,
      },
    });
  }

  return NextResponse.json({
    markdown,
    itemCount: items.length,
    fetchedAt: new Date().toISOString(),
  });
}
