import { NextResponse } from "next/server";
import { fetchIss } from "@/lib/connectors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchIss());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 },
    );
  }
}
