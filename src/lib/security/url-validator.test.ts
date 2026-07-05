import { describe, it, expect } from "vitest";
import { validateOutboundUrl } from "@/lib/security/url-validator";

describe("validateOutboundUrl", () => {
  it("allows public https URLs", () => {
    const r = validateOutboundUrl("https://example.com/article");
    expect(r.ok).toBe(true);
  });

  it("blocks localhost", () => {
    const r = validateOutboundUrl("http://localhost:3000/admin");
    expect(r.ok).toBe(false);
  });

  it("blocks metadata IP", () => {
    const r = validateOutboundUrl("http://169.254.169.254/latest/meta-data/");
    expect(r.ok).toBe(false);
  });

  it("blocks private IPs", () => {
    expect(validateOutboundUrl("http://192.168.1.1/").ok).toBe(false);
    expect(validateOutboundUrl("http://10.0.0.1/").ok).toBe(false);
  });

  it("blocks non-http protocols", () => {
    expect(validateOutboundUrl("file:///etc/passwd").ok).toBe(false);
  });
});
