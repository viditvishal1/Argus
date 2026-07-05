import { NextResponse } from "next/server";
import { listRecentAlerts } from "@/lib/alerts/engine";
import { trackApiRequest } from "@/lib/usage/tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  await trackApiRequest("/api/alerts");
  const alerts = await listRecentAlerts(30);
  return NextResponse.json({ alerts, fetchedAt: new Date().toISOString() });
}
