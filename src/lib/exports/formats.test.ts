import { describe, expect, it } from "vitest";
import { escapeCsvCell, itemsToCsv } from "./formats";

describe("exports formats", () => {
  it("escapes csv cells with commas", () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });

  it("builds csv rows", () => {
    const csv = itemsToCsv([{ a: "1", b: "x" }], ["a", "b"]);
    expect(csv).toBe("a,b\n1,x");
  });
});
