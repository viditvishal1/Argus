import { NextResponse } from "next/server";
import { connectorStatuses, fetchPlatformStatuses } from "@/lib/connectors";
import { aiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const platforms = await fetchPlatformStatuses().catch(() => []);
  return NextResponse.json({
    connectors: connectorStatuses(),
    platforms,
    aiEnabled: aiEnabled(),
    fetchedAt: new Date().toISOString(),
  });
}
