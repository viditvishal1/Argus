import { describe, expect, it } from "vitest";
import { equityQuoteToItem } from "@/lib/markets/equity-items";
import type { EquityQuote } from "@/lib/markets/equity";

describe("equityQuoteToItem", () => {
  it("maps quote to markets Item with price", () => {
    const q: EquityQuote = {
      symbol: "TSLA",
      name: "Tesla, Inc.",
      price: 250.5,
      changePct: 1.2,
      currency: "USD",
      exchange: "NASDAQ",
      observedAt: new Date().toISOString(),
      provider: "Yahoo Finance",
      dataDelay: "Delayed",
    };
    const item = equityQuoteToItem(
      { symbol: "TSLA", name: "Tesla", assetClass: "equity", exchange: "NASDAQ" },
      q,
    );
    expect(item.extra?.price).toBe(250.5);
    expect(item.tags).toContain("equity");
  });
});
