-- EarthOS Platform Foundation (Phase 1)
-- Run after base schema.sql or standalone in Supabase SQL Editor

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Data source configuration (replaces hardcoded connector lists)
-- ---------------------------------------------------------------------------
create table if not exists data_sources (
  id text primary key,
  name text not null,
  source_type text not null,
  provider text not null,
  base_url text,
  enabled boolean not null default true,
  priority integer not null default 50,
  polling_interval_seconds integer not null default 300,
  retention_hours integer not null default 48,
  daily_request_budget integer,
  daily_byte_budget bigint,
  geographic_scope text,
  rate_limit_per_minute integer,
  reliability_score numeric(3,2) default 0.80,
  requires_api_key boolean not null default false,
  api_key_env_var text,
  config_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_sources_enabled on data_sources (enabled, priority desc);

-- ---------------------------------------------------------------------------
-- Durable connector run history (replaces in-process-only status)
-- ---------------------------------------------------------------------------
create table if not exists connector_runs (
  id bigserial primary key,
  source_id text not null references data_sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','success','error','timeout','skipped')),
  item_count integer not null default 0,
  latency_ms integer,
  error_message text,
  bytes_fetched bigint,
  requests_used integer default 1
);

create index if not exists connector_runs_source on connector_runs (source_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Ingestion provenance (metadata; raw payloads go to R2)
-- ---------------------------------------------------------------------------
create table if not exists ingestion_records (
  id text primary key,
  source_id text not null references data_sources(id),
  provider text not null,
  external_id text,
  ingested_at timestamptz not null default now(),
  observed_at timestamptz,
  source_url text,
  content_hash text,
  schema_version text not null default '1',
  raw_object_key text,
  processing_status text not null default 'pending'
    check (processing_status in ('pending','validated','normalized','indexed','failed','archived')),
  reliability_score numeric(3,2),
  expires_at timestamptz,
  retention_class text not null default 'standard'
);

create index if not exists ingestion_records_source on ingestion_records (source_id, ingested_at desc);
create index if not exists ingestion_records_expires on ingestion_records (expires_at) where expires_at is not null;

-- ---------------------------------------------------------------------------
-- Feature flags
-- ---------------------------------------------------------------------------
create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  config_json jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Usage metrics (cost / quota tracking)
-- ---------------------------------------------------------------------------
create table if not exists usage_metrics (
  id bigserial primary key,
  metric_key text not null,
  metric_value numeric not null,
  unit text not null default 'count',
  dimensions jsonb not null default '{}',
  recorded_at timestamptz not null default now()
);

create index if not exists usage_metrics_key on usage_metrics (metric_key, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Retention policies
-- ---------------------------------------------------------------------------
create table if not exists retention_policies (
  id text primary key,
  domain text not null,
  retention_hours integer not null,
  retention_class text not null,
  description text,
  enabled boolean not null default true
);

insert into retention_policies (id, domain, retention_hours, retention_class, description) values
  ('raw_aviation', 'aviation_positions', 12, 'raw', 'Raw aviation positions'),
  ('raw_traffic', 'traffic_observations', 3, 'raw', 'Raw traffic observations'),
  ('raw_marine', 'marine_ais', 24, 'raw', 'Raw marine AIS'),
  ('raw_news', 'news_payloads', 48, 'raw', 'Raw news payloads'),
  ('raw_market_ticks', 'market_ticks', 24, 'raw', 'Market ticks'),
  ('normalized_obs', 'normalized', 168, 'normalized', 'Normalized observations (7d)'),
  ('hourly_rollups', 'rollups_hourly', 720, 'rollup', 'Hourly rollups (30d)'),
  ('entity_graph', 'ontology', 876000, 'permanent', 'Entity graph — permanent')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Location registry (PostGIS) — airports, ports, cities from config
-- ---------------------------------------------------------------------------
create table if not exists geo_locations (
  id text primary key,
  name text not null,
  location_type text not null check (location_type in ('city','airport','port','region','bbox')),
  geom geography(point, 4326),
  bbox jsonb,
  country_code text,
  identifiers jsonb not null default '{}',
  config_json jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists geo_locations_geom on geo_locations using gist (geom);
create index if not exists geo_locations_type on geo_locations (location_type, enabled);

-- ---------------------------------------------------------------------------
-- Market instruments catalogue (replaces hardcoded YAHOO_SYMBOLS)
-- ---------------------------------------------------------------------------
create table if not exists market_instruments (
  id text primary key,
  symbol text not null,
  name text not null,
  instrument_type text not null,
  exchange text,
  provider text not null default 'yahoo',
  currency text,
  enabled boolean not null default true,
  config_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists market_instruments_symbol on market_instruments (symbol, enabled);

-- ---------------------------------------------------------------------------
-- Secure RLS — service role bypasses; client roles denied by default
-- ---------------------------------------------------------------------------
alter table data_sources enable row level security;
alter table connector_runs enable row level security;
alter table ingestion_records enable row level security;
alter table feature_flags enable row level security;
alter table usage_metrics enable row level security;
alter table retention_policies enable row level security;
alter table geo_locations enable row level security;
alter table market_instruments enable row level security;

-- Drop legacy open policies on original tables if present
drop policy if exists earthos_article_cache_all on article_cache;
drop policy if exists earthos_ingested_items_all on ingested_items;
drop policy if exists earthos_event_log_all on event_log;
drop policy if exists earthos_bookmarks_all on bookmarks;

-- Server-side service role only (no policies = denied for anon/authenticated)
-- Reads via Next.js API using SUPABASE_SERVICE_KEY

-- Optional read-only for authenticated users (future Phase 2)
create policy data_sources_read_auth on data_sources
  for select to authenticated using (enabled = true);

create policy geo_locations_read_auth on geo_locations
  for select to authenticated using (enabled = true);

create policy market_instruments_read_auth on market_instruments
  for select to authenticated using (enabled = true);

create policy retention_policies_read_auth on retention_policies
  for select to authenticated using (enabled = true);

-- Deny anon on all platform tables (explicit)
create policy deny_anon_data_sources on data_sources for all to anon using (false);
create policy deny_anon_connector_runs on connector_runs for all to anon using (false);
create policy deny_anon_ingestion on ingestion_records for all to anon using (false);
create policy deny_anon_feature_flags on feature_flags for all to anon using (false);
create policy deny_anon_usage on usage_metrics for all to anon using (false);
create policy deny_anon_geo on geo_locations for all to anon using (false);
create policy deny_anon_markets on market_instruments for all to anon using (false);

-- Legacy tables: deny anon writes (service role used server-side)
create policy deny_anon_article_cache on article_cache for all to anon using (false);
create policy deny_anon_ingested_items on ingested_items for all to anon using (false);
create policy deny_anon_event_log on event_log for all to anon using (false);
create policy deny_anon_bookmarks on bookmarks for all to anon using (false);

-- Default feature flags
insert into feature_flags (key, enabled, description) values
  ('r2_archive', false, 'Archive raw payloads to Cloudflare R2'),
  ('redis_cache', false, 'Use Redis for distributed cache'),
  ('clickhouse_analytics', false, 'ClickHouse time-series adapter'),
  ('opensearch', false, 'OpenSearch full-text index'),
  ('hybrid_search', false, 'Hybrid lexical + vector search'),
  ('background_ingestion', false, 'Scheduled ingestion workers'),
  ('strict_rate_limits', true, 'Enforce API rate limits')
on conflict (key) do nothing;
