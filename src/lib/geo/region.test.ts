import { describe, expect, it } from "vitest";
import { isInIndia, pickTrafficRegion } from "@/lib/geo/region";

describe("India region", () => {
  it("detects Delhi as India", () => {
    expect(isInIndia(28.61, 77.21)).toBe(true);
    expect(pickTrafficRegion(28.61, 77.21)).toBe("india");
  });

  it("detects London as global", () => {
    expect(isInIndia(51.51, -0.13)).toBe(false);
    expect(pickTrafficRegion(51.51, -0.13)).toBe("global");
  });
});
