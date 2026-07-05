import { NextRequest, NextResponse } from "next/server";
import { fetchTrafficFlow, trafficEnabled } from "@/lib/traffic/tomtom";
import { isTomtomConfigured } from "@/lib/platform/integrations";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/traffic");
  if (!trafficEnabled()) {
    return NextResponse.json({
      enabled: false,
      configured: isTomtomConfigured(),
      message: "Live traffic requires TOMTOM_API_KEY on the server. Streets layer shows OSM roads only.",
      segments: [],
    });
  }

  const minLat = Number(req.nextUrl.searchParams.get("minLat"));
  const minLon = Number(req.nextUrl.searchParams.get("minLon"));
  const maxLat = Number(req.nextUrl.searchParams.get("maxLat"));
  const maxLon = Number(req.nextUrl.searchParams.get("maxLon"));
  if ([minLat, minLon, maxLat, maxLon].some(Number.isNaN)) {
    return NextResponse.json({ error: "bbox required" }, { status: 400 });
  }

  const segments = await fetchTrafficFlow({ minLat, minLon, maxLat, maxLon });
  return NextResponse.json({
    enabled: true,
    configured: true,
    provider: "TomTom",
    dataDelay: "near-real-time",
    segments,
    fetchedAt: new Date().toISOString(),
  });
}
