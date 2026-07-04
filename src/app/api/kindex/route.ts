import { NextResponse } from "next/server";
import { fetchKIndex } from "@/lib/connectors";

export const dynamic = "force-dynamic";

export async function GET() {
  const k = await fetchKIndex().catch(() => null);
  return NextResponse.json(k ?? { error: "unavailable" }, { status: k ? 200 : 502 });
}
