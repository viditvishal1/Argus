import { NextRequest, NextResponse } from "next/server";
import { isMapplsConfigured, isTomtomConfigured } from "@/lib/platform/integrations";
import { anyTrafficEnabled, fetchTrafficForBbox } from "@/lib/traffic/provider";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await trackApiRequest("/api/traffic");
  if (!anyTrafficEnabled()) {
    return NextResponse.json({
      enabled: false,
      configured: false,
      mapplsConfigured: isMapplsConfigured(),
      tomtomConfigured: isTomtomConfigured(),
      message:
        "Live traffic requires MAPPLS_API_KEY (India) and/or TOMTOM_API_KEY. Streets layer shows OSM roads only.",
      segments: [],
      providers: [],
    });
  }

  const minLat = Number(req.nextUrl.searchParams.get("minLat"));
  const minLon = Number(req.nextUrl.searchParams.get("minLon"));
  const maxLat = Number(req.nextUrl.searchParams.get("maxLat"));
  const maxLon = Number(req.nextUrl.searchParams.get("maxLon"));
  if ([minLat, minLon, maxLat, maxLon].some(Number.isNaN)) {
    return NextResponse.json({ error: "bbox required" }, { status: 400 });
  }

  const result = await fetchTrafficForBbox({ minLat, minLon, maxLat, maxLon });
  return NextResponse.json({
    ...result,
    configured: true,
    mapplsConfigured: isMapplsConfigured(),
    tomtomConfigured: isTomtomConfigured(),
    dataDelay: "near-real-time",
    fetchedAt: new Date().toISOString(),
  });
}
