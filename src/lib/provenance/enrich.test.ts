import { describe, expect, it } from "vitest";
import { enrichItemProvenance, sourceTierForConnector } from "./enrich";
import type { Item } from "@/lib/types";

const base: Item = {
  id: "x",
  module: "earth",
  connectorId: "usgs_earthquakes",
  title: "Quake",
  source: "USGS",
  timestamp: "2026-01-01T00:00:00Z",
  tags: [],
  entities: [],
  contentPolicy: "metadata_only",
};

describe("provenance enrich", () => {
  it("assigns official tier to government connectors", () => {
    expect(sourceTierForConnector("usgs_earthquakes")).toBe("official");
  });

  it("stamps provenance fields", () => {
    const out = enrichItemProvenance(base, { connectorId: "usgs_earthquakes" });
    expect(out.provenance?.sourceTier).toBe("official");
    expect(out.provenance?.methodologyVersion).toBe("provenance-v1");
    expect(out.provenance?.observedAt).toBe(base.timestamp);
  });
});
