/**
 * Polymarket prediction markets connector (G16) — public gamma API.
 */

import type { Item } from "@/lib/types";
import { fetchWithTimeout, registerConnector } from "./framework";

interface PolyMarket {
  id: string;
  question?: string;
  slug?: string;
  volume?: number;
  liquidity?: number;
  outcomePrices?: string;
  active?: boolean;
}

registerConnector(
  {
    id: "polymarket_markets",
    module: "markets",
    source: "Polymarket",
    sourceUrl: "https://polymarket.com",
    scheduleSeconds: 300,
    contentPolicy: "metadata_only",
    entityTypes: ["event", "organization"],
  },
  async () => {
    const res = await fetchWithTimeout(
      "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=40&order=volume",
      { timeoutMs: 15000 },
    );
    if (!res.ok) throw new Error(`polymarket_http_${res.status}`);
    const markets = (await res.json()) as PolyMarket[];
    const now = new Date().toISOString();
    return (Array.isArray(markets) ? markets : []).slice(0, 40).map((m): Item => {
      let topProb: number | undefined;
      try {
        const prices = JSON.parse(m.outcomePrices ?? "[]") as string[];
        topProb = prices.length ? Math.round(Number(prices[0]) * 100) : undefined;
      } catch {
        /* ignore */
      }
      return {
        id: `polymarket:${m.id}`,
        module: "markets",
        connectorId: "polymarket_markets",
        title: m.question ?? m.slug ?? "Polymarket market",
        summary: topProb != null ? `Leading outcome ~${topProb}% · vol $${Math.round(m.volume ?? 0).toLocaleString()}` : `Vol $${Math.round(m.volume ?? 0).toLocaleString()}`,
        url: m.slug ? `https://polymarket.com/event/${m.slug}` : "https://polymarket.com",
        source: "Polymarket",
        timestamp: now,
        tags: ["prediction", "polymarket"],
        entities: [{ name: "Polymarket", type: "organization" }],
        contentPolicy: "metadata_only",
        region: "global",
        severity: topProb != null && (topProb >= 85 || topProb <= 15) ? 5 : undefined,
        extra: { volume: m.volume, liquidity: m.liquidity, topProb },
      };
    });
  },
);

export const POLYMARKET_CONNECTOR_ID = "polymarket_markets";
