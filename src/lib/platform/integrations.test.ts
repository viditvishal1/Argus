import { describe, expect, it } from "vitest";
import { isAishubConfigured, isTomtomConfigured } from "@/lib/platform/integrations";

describe("integrations config", () => {
  it("detects AISHub key presence", () => {
    delete process.env.AISHUB_API_KEY;
    expect(isAishubConfigured()).toBe(false);
    process.env.AISHUB_API_KEY = "test";
    expect(isAishubConfigured()).toBe(true);
    delete process.env.AISHUB_API_KEY;
  });

  it("detects TomTom key presence", () => {
    delete process.env.TOMTOM_API_KEY;
    expect(isTomtomConfigured()).toBe(false);
    process.env.TOMTOM_API_KEY = "test";
    expect(isTomtomConfigured()).toBe(true);
    delete process.env.TOMTOM_API_KEY;
  });
});
