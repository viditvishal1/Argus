import { describe, expect, it } from "vitest";
import { resolveFromQuery } from "@/lib/entity/resolution";

describe("entity resolution", () => {
  it("resolves tickers", () => {
    const r = resolveFromQuery("AAPL");
    expect(r?.objectType).toBe("instrument");
    expect(r?.id).toBe("instrument:aapl");
  });

  it("resolves ICAO codes", () => {
    const r = resolveFromQuery("VIDP");
    expect(r?.objectType).toBe("airport");
    expect(r?.identifiers?.[0]?.type).toBe("icao");
  });

  it("resolves MMSI", () => {
    const r = resolveFromQuery("123456789");
    expect(r?.objectType).toBe("vessel");
  });

  it("returns null for generic text", () => {
    expect(resolveFromQuery("climate policy")).toBeNull();
  });
});
