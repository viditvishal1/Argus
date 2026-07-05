import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  {
    key: "Content-Security-Policy-Report-Only",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-src 'self' https:; media-src 'self' https: blob:;",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: appRoot,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tfl.gov.uk" },
      { protocol: "https", hostname: "**.dot.ca.gov" },
      { protocol: "https", hostname: "**.wsdot.wa.gov" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
