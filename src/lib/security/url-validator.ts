// SSRF-safe URL validation for server-side fetchers.

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^\[::1\]/,
  /^169\.254\./,
  /^metadata\.google\.internal$/i,
  /^metadata$/i,
];

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata",
  "localhost",
]);

export interface UrlValidationResult {
  ok: boolean;
  error?: string;
  url?: URL;
}

export function validateOutboundUrl(raw: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "invalid url" };
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, error: "protocol not allowed" };
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, error: "host not allowed" };
  }

  for (const pat of BLOCKED_HOST_PATTERNS) {
    if (pat.test(host) || pat.test(parsed.hostname)) {
      return { ok: false, error: "host not allowed" };
    }
  }

  // Block numeric IPs in private ranges (basic check)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0) {
      return { ok: false, error: "private IP not allowed" };
    }
    if (a === 169 && b === 254) {
      return { ok: false, error: "link-local not allowed" };
    }
  }

  return { ok: true, url: parsed };
}

/** Validate redirect target before following (call after each redirect hop). */
export function validateRedirectUrl(location: string, originalHost: string): UrlValidationResult {
  const result = validateOutboundUrl(location);
  if (!result.ok) return result;
  // Optionally restrict cross-domain redirects for article fetcher
  if (result.url!.hostname !== originalHost) {
    // Allow common CDN/article redirects but block obvious internal pivots
    const blocked = validateOutboundUrl(location);
    if (!blocked.ok) return blocked;
  }
  return result;
}

export const MAX_FETCH_BYTES = 2_000_000;
export const MAX_REDIRECTS = 3;
