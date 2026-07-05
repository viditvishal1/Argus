// Platform-wide types for configuration, ingestion, and health.

export type ConnectorHealthState =
  | "unknown"
  | "healthy"
  | "degraded"
  | "error"
  | "key_gated"
  | "disabled"
  | "rate_limited";

export interface DataSourceConfig {
  id: string;
  name: string;
  source_type: string;
  provider: string;
  base_url?: string;
  enabled: boolean;
  priority: number;
  polling_interval_seconds: number;
  retention_hours: number;
  daily_request_budget?: number;
  daily_byte_budget?: number;
  geographic_scope?: string;
  rate_limit_per_minute?: number;
  reliability_score: number;
  requires_api_key: boolean;
  api_key_env_var?: string;
  config_json: Record<string, unknown>;
}

export interface IngestionRecordMeta {
  id: string;
  source_id: string;
  provider: string;
  external_id?: string;
  ingested_at: string;
  observed_at?: string;
  source_url?: string;
  content_hash?: string;
  schema_version: string;
  raw_object_key?: string;
  processing_status: "pending" | "validated" | "normalized" | "indexed" | "failed" | "archived";
  reliability_score?: number;
  expires_at?: string;
  retention_class: string;
}

export interface GeoLocationConfig {
  id: string;
  name: string;
  location_type: "city" | "airport" | "port" | "region" | "bbox";
  lat?: number;
  lon?: number;
  bbox?: [number, number, number, number];
  country_code?: string;
  identifiers: Record<string, string>;
  enabled: boolean;
}

export interface MarketInstrumentConfig {
  id: string;
  symbol: string;
  name: string;
  instrument_type: string;
  exchange?: string;
  provider: string;
  enabled: boolean;
}

export interface UsageSnapshot {
  supabaseRowsEstimate?: number;
  connectorRequestsToday: number;
  apiRequestsToday: number;
  r2Enabled: boolean;
  redisEnabled: boolean;
  quotaLevel: "normal" | "warning" | "reduced" | "paused" | "emergency" | "critical";
  fetchedAt: string;
}

export interface RetentionPolicy {
  id: string;
  domain: string;
  retention_hours: number;
  retention_class: string;
  enabled: boolean;
}
