import { NextRequest } from "next/server";
import { noCacheJson } from "@/lib/http/no-cache";
import { fetchEquityItemsLive } from "@/lib/markets/equity-batch";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/v1/markets/equity");
  const raw = req.nextUrl.searchParams.get("type") ?? "all";
  const type = raw === "equity" || raw === "index" ? raw : "all";
  const bundle = await fetchEquityItemsLive(type);
  return noCacheJson({
    items: bundle.items,
    count: bundle.items.length,
    failed: bundle.failed,
    type,
    fetchedAt: bundle.fetchedAt,
    source: "Yahoo Finance · on-demand",
  });
}
