import { describe, expect, it } from "vitest";
import { detectFindings } from "@/lib/intelligence/findings";
import type { Item } from "@/lib/types";

const base: Omit<Item, "id" | "title" | "module" | "tags" | "severity"> = {
  connectorId: "test",
  source: "test",
  timestamp: new Date().toISOString(),
  entities: [],
  contentPolicy: "metadata_only",
};

describe("detectFindings", () => {
  it("detects cyber kev", () => {
    const items: Item[] = [{
      ...base,
      id: "1",
      module: "cyber",
      title: "KEV entry",
      tags: ["kev"],
      severity: 9,
    }];
    const findings = detectFindings(items);
    expect(findings.some((f) => f.signalType === "cyber_kev")).toBe(true);
  });

  it("detects infrastructure cascade", () => {
    const items: Item[] = [
      { ...base, id: "1", module: "infrastructure", title: "AWS outage", tags: ["outage"], severity: 7 },
      { ...base, id: "2", module: "infrastructure", title: "CDN degraded", tags: ["cdn"], severity: 6 },
    ];
    const findings = detectFindings(items);
    expect(findings.some((f) => f.signalType === "infrastructure_cascade")).toBe(true);
  });

  it("detects maritime chokepoint with enough contacts", () => {
    const items: Item[] = Array.from({ length: 4 }, (_, i) => ({
      ...base,
      id: `m${i}`,
      module: "maritime",
      title: `Vessel ${i}`,
      tags: ["ais"],
      lat: 30.1,
      lon: 32.4,
    }));
    const findings = detectFindings(items);
    expect(findings.some((f) => f.signalType === "maritime_chokepoint")).toBe(true);
  });
});
