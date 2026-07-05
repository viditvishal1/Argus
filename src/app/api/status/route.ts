import { NextResponse } from "next/server";
import { connectorStatuses, fetchPlatformStatuses } from "@/lib/connectors";
import { aiEnabled } from "@/lib/ai";
import { checkSupabaseHealth, dbEnabled, dbUsesPublishableKey, supabaseUrl } from "@/lib/db";
import { buildIntegrationsSnapshot } from "@/lib/platform/integrations";

import { getUsageSnapshot, trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  await trackApiRequest("/api/status");
  const platforms = await fetchPlatformStatuses().catch(() => []);
  const supabase = await checkSupabaseHealth();
  const usage = await getUsageSnapshot();
  const integrations = await buildIntegrationsSnapshot();
  return NextResponse.json({
    connectors: connectorStatuses(),
    platforms,
    aiEnabled: aiEnabled(),
    integrations,
    usage,
    supabase: {
      configured: dbEnabled(),
      url: supabaseUrl() ? supabaseUrl()!.replace(/https:\/\//, "") : null,
      mode: dbUsesPublishableKey() ? "publishable" : supabase.mode ?? null,
      ok: supabase.ok,
      error: supabase.error,
    },
    fetchedAt: new Date().toISOString(),
  });
}
