import type { EquityQuote } from "@/lib/markets/equity";
import type { Item } from "@/lib/types";

export function equityQuoteToItem(
  meta: { symbol: string; name: string; assetClass: string; exchange?: string },
  q: EquityQuote,
): Item {
  return {
    id: `stock:${meta.symbol}`,
    module: "markets",
    connectorId: "equity_live",
    title: `${q.name || meta.name} (${meta.symbol.replace("^", "")})`,
    summary: `${q.price.toLocaleString()} ${q.currency} · ${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}% · ${q.exchange}`,
    source: q.provider,
    url: `https://finance.yahoo.com/quote/${encodeURIComponent(meta.symbol)}`,
    timestamp: q.observedAt,
    severity: Math.min(10, Math.abs(q.changePct)),
    severityLabel: `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%`,
    tags: meta.assetClass === "index" ? ["index"] : ["equity"],
    entities: [{ name: meta.name, type: "instrument" }],
    contentPolicy: "full_cache",
    extra: {
      price: q.price,
      change24h: q.changePct,
      change7d: q.change7d,
      assetClass: meta.assetClass,
      symbol: meta.symbol,
      exchange: meta.exchange ?? q.exchange,
      currency: q.currency,
      dataDelay: q.dataDelay,
      provider: q.provider,
      sparkline: q.sparkline,
      high52: q.high52,
      low52: q.low52,
      volume: q.volume,
    },
  };
}
