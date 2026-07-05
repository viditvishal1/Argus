import { describe, expect, it } from "vitest";
import { generateApiKey } from "./api-keys";

describe("api keys", () => {
  it("generates argus-prefixed keys with unique hashes", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw.startsWith("argus_")).toBe(true);
    expect(a.hash).not.toBe(b.hash);
    expect(a.prefix).toBe(a.raw.slice(0, 12));
  });
});
