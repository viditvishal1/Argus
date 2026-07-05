import { NextResponse } from "next/server";
import { getMapplsKey, mapplsTrafficEnabled } from "@/lib/traffic/mappls";

export const dynamic = "force-dynamic";

/** Client bootstrap for Mappls Web SDK — key is domain-restricted in Mappls Console. */
export async function GET() {
  const key = getMapplsKey();
  if (!key) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({
    configured: true,
    trafficEnabled: mapplsTrafficEnabled(),
    sdkUrl: `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(key)}`,
  });
}
