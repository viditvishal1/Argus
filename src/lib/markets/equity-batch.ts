import { listMarketInstruments } from "@/lib/markets/instruments";
import { equityQuoteToItem } from "@/lib/markets/equity-items";
import { fetchEquityQuote } from "@/lib/markets/equity";
import type { Item } from "@/lib/types";

const BATCH_CONCURRENCY = 4;

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const result = await fn(items[idx]);
      if (result != null) out.push(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

/** On-demand equity/index quotes — does not rely on cron cache. */
export async function fetchEquityItemsLive(
  type: "equity" | "index" | "all" = "all",
): Promise<{ items: Item[]; failed: number; fetchedAt: string }> {
  const instruments = await listMarketInstruments();
  const filtered = instruments.filter((inst) => {
    if (type === "all") return inst.instrumentType !== "crypto";
    return inst.instrumentType === type;
  });

  const results = await mapPool(filtered, BATCH_CONCURRENCY, async (inst) => {
    const q = await fetchEquityQuote(inst.symbol);
    if (!q) return null;
    return equityQuoteToItem(
      {
        symbol: inst.symbol,
        name: inst.name,
        assetClass: inst.instrumentType,
        exchange: inst.exchange,
      },
      q,
    );
  });

  return {
    items: results,
    failed: filtered.length - results.length,
    fetchedAt: new Date().toISOString(),
  };
}
