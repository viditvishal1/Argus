import { describe, expect, it } from "vitest";

describe("new connectors", () => {
  it("registers telegram, polymarket, and forecast connectors", async () => {
    await import("./telegram");
    await import("./polymarket");
    await import("./forecasts");
    const { connectorStatuses } = await import("./framework");
    const ids = connectorStatuses().map((c) => c.id);
    expect(ids).toContain("telegram_channels");
    expect(ids).toContain("polymarket_markets");
    expect(ids).toContain("open_meteo_forecast");
  });
});
