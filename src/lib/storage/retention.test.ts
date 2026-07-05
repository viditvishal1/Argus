import { describe, it, expect } from "vitest";
import { quotaLevelFromUsage, computeExpiresAt } from "@/lib/storage/retention";

describe("retention", () => {
  it("computes expiry from retention class", () => {
    const exp = computeExpiresAt("news_payloads", 48);
    expect(exp.getTime()).toBeGreaterThan(Date.now());
  });

  it("escalates quota levels", () => {
    expect(quotaLevelFromUsage(50)).toBe("normal");
    expect(quotaLevelFromUsage(80)).toBe("reduced");
    expect(quotaLevelFromUsage(99)).toBe("critical");
  });
});
