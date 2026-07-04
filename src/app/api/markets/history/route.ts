import { NextRequest, NextResponse } from "next/server";
import { fetchCryptoHistory, fetchStockHistory } from "@/lib/connectors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const kind = req.nextUrl.searchParams.get("kind") ?? "stock";
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  try {
    const history =
      kind === "crypto" ? await fetchCryptoHistory(symbol) : await fetchStockHistory(symbol);
    return NextResponse.json({ symbol, history });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 },
    );
  }
}
