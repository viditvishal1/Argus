import { describe, expect, it } from "vitest";

describe("governance connectors", () => {
  it("registers travel advisory and sanctions connectors", async () => {
    await import("./governance");
    const { connectorStatuses } = await import("./framework");
    const ids = connectorStatuses().map((c) => c.id);
    expect(ids).toContain("travel_advisories");
    expect(ids).toContain("sanctions_pressure");
  });
});
