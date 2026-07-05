import { NextResponse } from "next/server";
import { getDataSources, getCityPresets, getMarketInstruments } from "@/lib/config/sources";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  await trackApiRequest("/api/config/sources");
  const [sources, cities, instruments] = await Promise.all([
    getDataSources(),
    getCityPresets(),
    getMarketInstruments(),
  ]);

  return NextResponse.json({
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      source_type: s.source_type,
      provider: s.provider,
      enabled: s.enabled,
      priority: s.priority,
      polling_interval_seconds: s.polling_interval_seconds,
      geographic_scope: s.geographic_scope,
      reliability_score: s.reliability_score,
      requires_api_key: s.requires_api_key,
    })),
    cities,
    instruments,
    fetchedAt: new Date().toISOString(),
  });
}
