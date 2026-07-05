import { NextResponse } from "next/server";
import { fetchIss } from "@/lib/connectors";
import { readLive } from "@/lib/live/store";

export const dynamic = "force-dynamic";

type IssPosition = Awaited<ReturnType<typeof fetchIss>>;

export async function GET() {
  const result = await readLive<IssPosition | null>(
    "iss:position",
    fetchIss,
    { ttlSeconds: 30, source: "wheretheiss.at", fallback: null, coldTimeoutMs: 6_000 },
  );

  if (!result.data) {
    return NextResponse.json(
      { error: "ISS position unavailable", stale: result.stale },
      { status: result.cold ? 503 : 502 },
    );
  }

  return NextResponse.json({
    ...result.data,
    stale: result.stale,
    ageSeconds: result.ageSeconds == null ? null : Math.round(result.ageSeconds),
    updatedAt: result.updatedAt,
  });
}
