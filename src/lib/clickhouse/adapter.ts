// ClickHouse analytics adapter — optional prod; PostgreSQL/file dev fallback.

export interface TimeSeriesPoint {
  ts: string;
  value: number;
  dimensions?: Record<string, string>;
}

export function clickhouseEnabled(): boolean {
  return Boolean(process.env.CLICKHOUSE_URL);
}

export async function queryTimeSeries(
  domain: string,
  since: Date,
  limit = 1000,
): Promise<TimeSeriesPoint[]> {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) {
    // Dev fallback: empty — wired in Phase 3 production deploy
    return [];
  }

  const user = process.env.CLICKHOUSE_USER ?? "default";
  const pass = process.env.CLICKHOUSE_PASSWORD ?? "";
  const db = process.env.CLICKHOUSE_DATABASE ?? "earthos";
  const auth = pass ? `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` : undefined;

  const query = encodeURIComponent(
    `SELECT ts, value FROM ${db}.observations WHERE domain='${domain}' AND ts >= '${since.toISOString()}' ORDER BY ts DESC LIMIT ${limit} FORMAT JSON`,
  );

  const res = await fetch(`${url.replace(/\/$/, "")}/?query=${query}`, {
    headers: auth ? { Authorization: auth } : {},
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).map((row: { ts: string; value: number }) => ({
    ts: row.ts,
    value: row.value,
  }));
}
