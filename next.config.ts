import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // News thumbnails / EONET imagery come from arbitrary public hosts;
    // we render them with plain <img> in the reader, so no remotePatterns needed.
  },
};

export default nextConfig;
