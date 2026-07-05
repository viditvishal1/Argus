import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { readModuleLiveCached } from "@/lib/live/module-cache";
import { BOOTSTRAP_MODULES } from "@/lib/live/config";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

const DIGEST_MODULES = [...BOOTSTRAP_MODULES, "aviation", "maritime", "startup", "government"] as const;

/** Cross-feed intelligence digest (G04) — up to 500 recent items. */
export async function GET(req: NextRequest) {
  const limit = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 500)));
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  const results = await Promise.all(DIGEST_MODULES.map((m) => readModuleLiveCached(m)));
  const items = results
    .flatMap((r) => r?.data ?? [])
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);

  if (format === "csv") {
    const header = "id,module,title,source,timestamp\n";
    const rows = items.map((i: Item) =>
      [i.id, i.module, `"${i.title.replace(/"/g, '""')}"`, i.source, i.timestamp].join(","),
    ).join("\n");
    return new Response(header + rows, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  return noCacheJson({
    count: items.length,
    modules: DIGEST_MODULES,
    items,
    fetchedAt: new Date().toISOString(),
  });
}
