// Supabase platform tables — service role required for writes.

import { dbEnabled, supabaseKey, supabaseUrl } from "@/lib/db";
import type { DataSourceConfig, GeoLocationConfig, MarketInstrumentConfig } from "@/lib/platform/types";
import {
  SEED_AVIATION_REGIONS,
  SEED_CITIES,
  SEED_DATA_SOURCES,
  SEED_MARKET_INSTRUMENTS,
} from "@/lib/config/seeds";

type Row = Record<string, unknown>;

async function serviceClient() {
  if (!dbEnabled()) return null;
  const key = process.env.SUPABASE_SERVICE_KEY ?? supabaseKey();
  if (!key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supabaseUrl()!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapSource(row: Row): DataSourceConfig {
  return {
    id: String(row.id),
    name: String(row.name),
    source_type: String(row.source_type),
    provider: String(row.provider),
    base_url: row.base_url ? String(row.base_url) : undefined,
    enabled: Boolean(row.enabled),
    priority: Number(row.priority ?? 50),
    polling_interval_seconds: Number(row.polling_interval_seconds ?? 300),
    retention_hours: Number(row.retention_hours ?? 48),
    daily_request_budget: row.daily_request_budget != null ? Number(row.daily_request_budget) : undefined,
    daily_byte_budget: row.daily_byte_budget != null ? Number(row.daily_byte_budget) : undefined,
    geographic_scope: row.geographic_scope ? String(row.geographic_scope) : undefined,
    rate_limit_per_minute: row.rate_limit_per_minute != null ? Number(row.rate_limit_per_minute) : undefined,
    reliability_score: Number(row.reliability_score ?? 0.8),
    requires_api_key: Boolean(row.requires_api_key),
    api_key_env_var: row.api_key_env_var ? String(row.api_key_env_var) : undefined,
    config_json: (row.config_json as Record<string, unknown>) ?? {},
  };
}

export async function getDataSourcesFromDb(): Promise<DataSourceConfig[]> {
  const c = await serviceClient();
  if (!c) return [];
  const { data, error } = await c.from("data_sources").select("*").order("priority", { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(mapSource);
}

export async function getGeoLocationsFromDb(type?: string): Promise<GeoLocationConfig[]> {
  const c = await serviceClient();
  if (!c) return [];
  let q = c.from("geo_locations").select("*").eq("enabled", true);
  if (type) q = q.eq("location_type", type);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as Row[]).map((row) => {
    const cfg = (row.config_json as { lat?: number; lon?: number }) ?? {};
    return {
      id: String(row.id),
      name: String(row.name),
      location_type: row.location_type as GeoLocationConfig["location_type"],
      lat: cfg.lat ?? (row.bbox && Array.isArray(row.bbox) ? undefined : undefined),
      lon: cfg.lon,
      bbox: Array.isArray(row.bbox) ? row.bbox as [number, number, number, number] : undefined,
      country_code: row.country_code ? String(row.country_code) : undefined,
      identifiers: (row.identifiers as Record<string, string>) ?? {},
      enabled: Boolean(row.enabled),
    };
  });
}

export async function getMarketInstrumentsFromDb(): Promise<MarketInstrumentConfig[]> {
  const c = await serviceClient();
  if (!c) return [];
  const { data, error } = await c.from("market_instruments").select("*").eq("enabled", true);
  if (error || !data) return [];
  return (data as Row[]).map((row) => ({
    id: String(row.id),
    symbol: String(row.symbol),
    name: String(row.name),
    instrument_type: String(row.instrument_type),
    exchange: row.exchange ? String(row.exchange) : undefined,
    provider: String(row.provider ?? "yahoo"),
    enabled: Boolean(row.enabled),
  }));
}

export async function getFeatureFlagsFromDb(): Promise<Record<string, boolean>> {
  const c = await serviceClient();
  if (!c) return {};
  const { data, error } = await c.from("feature_flags").select("key, enabled");
  if (error || !data) return {};
  const out: Record<string, boolean> = {};
  for (const row of data as Row[]) out[String(row.key)] = Boolean(row.enabled);
  return out;
}

export async function recordConnectorRun(params: {
  sourceId: string;
  status: string;
  itemCount: number;
  latencyMs?: number;
  errorMessage?: string;
  bytesFetched?: number;
}): Promise<void> {
  const c = await serviceClient();
  if (!c) return;
  await c.from("connector_runs").insert({
    source_id: params.sourceId,
    status: params.status,
    item_count: params.itemCount,
    latency_ms: params.latencyMs ?? null,
    error_message: params.errorMessage ?? null,
    bytes_fetched: params.bytesFetched ?? null,
    finished_at: new Date().toISOString(),
  });
}

export async function recordUsageMetric(key: string, value: number, unit = "count", dimensions: Record<string, unknown> = {}): Promise<void> {
  const c = await serviceClient();
  if (!c) return;
  await c.from("usage_metrics").insert({
    metric_key: key,
    metric_value: value,
    unit,
    dimensions,
    recorded_at: new Date().toISOString(),
  });
}

export async function seedPlatformConfig(): Promise<{ sources: number; cities: number; instruments: number }> {
  const c = await serviceClient();
  if (!c) throw new Error("Supabase service client unavailable");

  let sources = 0;
  for (const s of SEED_DATA_SOURCES) {
    const { error } = await c.from("data_sources").upsert({
      ...s,
      config_json: {},
      updated_at: new Date().toISOString(),
    });
    if (!error) sources += 1;
  }

  let cities = 0;
  for (const city of SEED_CITIES) {
    const { error } = await c.from("geo_locations").upsert({
      id: city.id,
      name: city.name,
      location_type: city.location_type,
      country_code: city.country_code ?? null,
      identifiers: city.identifiers,
      config_json: { lat: city.lat, lon: city.lon },
      enabled: city.enabled,
    });
    if (!error) cities += 1;
  }

  for (const region of SEED_AVIATION_REGIONS) {
    await c.from("geo_locations").upsert({
      id: region.id,
      name: region.name,
      location_type: region.location_type,
      bbox: region.bbox ?? null,
      identifiers: region.identifiers,
      config_json: {},
      enabled: region.enabled,
    });
  }

  let instruments = 0;
  for (const inst of SEED_MARKET_INSTRUMENTS) {
    const { error } = await c.from("market_instruments").upsert({
      ...inst,
      config_json: {},
    });
    if (!error) instruments += 1;
  }

  return { sources, cities, instruments };
}

export async function getLatestConnectorRun(sourceId: string): Promise<{ status: string; finished_at?: string } | null> {
  const c = await serviceClient();
  if (!c) return null;
  const { data, error } = await c
    .from("connector_runs")
    .select("status, finished_at")
    .eq("source_id", sourceId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { status: String((data as Row).status), finished_at: (data as Row).finished_at ? String((data as Row).finished_at) : undefined };
}

export async function getUsageSummary(since: Date): Promise<Record<string, number>> {
  const c = await serviceClient();
  if (!c) return {};
  const { data, error } = await c
    .from("usage_metrics")
    .select("metric_key, metric_value")
    .gte("recorded_at", since.toISOString());
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data as Row[]) {
    const k = String(row.metric_key);
    out[k] = (out[k] ?? 0) + Number(row.metric_value);
  }
  return out;
}
