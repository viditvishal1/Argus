import { NextRequest, NextResponse } from "next/server";
import { getCityPresets } from "@/lib/config/sources";

export const dynamic = "force-dynamic";

export async function GET() {
  const cities = await getCityPresets();
  return NextResponse.json({
    cities: cities.map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      country_code: c.country_code,
    })),
    fetchedAt: new Date().toISOString(),
  });
}
