import { describe, expect, it } from "vitest";
import { shouldCollectAtQuota, quotaLevelFromUsage } from "@/lib/storage/retention";

describe("retention quota", () => {
  it("allows all sources at normal quota", () => {
    expect(shouldCollectAtQuota(50, "normal")).toBe(true);
    expect(shouldCollectAtQuota(50, "warning")).toBe(true);
  });

  it("blocks low priority at critical", () => {
    expect(shouldCollectAtQuota(50, "critical")).toBe(false);
    expect(shouldCollectAtQuota(95, "critical")).toBe(false);
  });

  it("computes quota levels from usage pct", () => {
    expect(quotaLevelFromUsage(50)).toBe("normal");
    expect(quotaLevelFromUsage(65)).toBe("warning");
    expect(quotaLevelFromUsage(99)).toBe("critical");
  });
});
