-- EarthOS Phase 2–4: Ontology, search, investigations, alerts
-- Requires: 001_platform_foundation.sql

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Organisations (foundation for tenant isolation — Phase 2 auth wires here)
-- ---------------------------------------------------------------------------
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

insert into organisations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Default', 'default')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Entity master (Palantir-style ontology L4 semantic memory)
-- ---------------------------------------------------------------------------
create table if not exists entities (
  id text primary key,
  object_type text not null,
  canonical_name text not null,
  description text,
  wikidata_id text,
  confidence numeric(3,2) not null default 0.5,
  resolution_method text not null default 'heuristic',
  org_id uuid references organisations(id) default '00000000-0000-0000-0000-000000000001',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists entities_type on entities (object_type);
create index if not exists entities_name on entities (canonical_name);
create index if not exists entities_wikidata on entities (wikidata_id) where wikidata_id is not null;

create table if not exists entity_aliases (
  id bigserial primary key,
  entity_id text not null references entities(id) on delete cascade,
  alias text not null,
  alias_normalized text not null,
  source_id text,
  unique (entity_id, alias_normalized)
);

create index if not exists entity_aliases_lookup on entity_aliases (alias_normalized);

create table if not exists entity_identifiers (
  id bigserial primary key,
  entity_id text not null references entities(id) on delete cascade,
  id_type text not null,
  id_value text not null,
  source_id text,
  unique (id_type, id_value)
);

create index if not exists entity_identifiers_lookup on entity_identifiers (id_type, id_value);

-- ---------------------------------------------------------------------------
-- Evidence-backed relationships (not co-occurrence alone)
-- ---------------------------------------------------------------------------
create table if not exists entity_relationships (
  id text primary key,
  source_entity_id text not null references entities(id) on delete cascade,
  target_entity_id text not null references entities(id) on delete cascade,
  relationship_type text not null,
  valid_from timestamptz,
  valid_to timestamptz,
  confidence numeric(3,2) not null default 0.5,
  resolution_method text not null default 'inferred',
  source_id text,
  source_url text,
  evidence_id text,
  item_id text,
  created_at timestamptz not null default now()
);

create index if not exists entity_rel_source on entity_relationships (source_entity_id);
create index if not exists entity_rel_target on entity_relationships (target_entity_id);

-- ---------------------------------------------------------------------------
-- Search index (PostgreSQL full-text fallback when OpenSearch unavailable)
-- ---------------------------------------------------------------------------
create table if not exists search_documents (
  id text primary key,
  module text not null,
  source_id text,
  title text not null,
  body text,
  summary text,
  url text,
  published_at timestamptz,
  ingested_at timestamptz not null default now(),
  tags text[] default '{}',
  entity_ids text[] default '{}',
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C')
  ) stored
);

create index if not exists search_documents_fts on search_documents using gin (search_vector);
create index if not exists search_documents_module on search_documents (module, ingested_at desc);

-- ---------------------------------------------------------------------------
-- Vector memory (pgvector — selective embeddings)
-- ---------------------------------------------------------------------------
create table if not exists entity_embeddings (
  entity_id text primary key references entities(id) on delete cascade,
  embedding vector(768),
  model text not null default 'text-embedding-004',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Watchlists
-- ---------------------------------------------------------------------------
create table if not exists watchlists (
  id text primary key,
  org_id uuid references organisations(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  entity_ids text[] default '{}',
  symbols text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Investigations (Phase 4 workspace)
-- ---------------------------------------------------------------------------
create table if not exists investigations (
  id text primary key,
  org_id uuid references organisations(id) default '00000000-0000-0000-0000-000000000001',
  title text not null,
  status text not null default 'open' check (status in ('open','active','review','closed')),
  hypothesis text,
  assignee text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists investigation_evidence (
  id bigserial primary key,
  investigation_id text not null references investigations(id) on delete cascade,
  item_id text,
  url text,
  title text not null,
  excerpt text,
  pinned_at timestamptz not null default now(),
  citation jsonb not null default '{}'
);

create table if not exists investigation_notes (
  id bigserial primary key,
  investigation_id text not null references investigations(id) on delete cascade,
  author text not null default 'analyst',
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Alert engine (Phase 3 cross-domain)
-- ---------------------------------------------------------------------------
create table if not exists alert_rules (
  id text primary key,
  org_id uuid references organisations(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  rule_type text not null,
  enabled boolean not null default true,
  config_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists alert_events (
  id bigserial primary key,
  rule_id text references alert_rules(id) on delete set null,
  severity text not null default 'info',
  title text not null,
  message text,
  payload jsonb not null default '{}',
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists alert_events_recent on alert_events (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — deny anon; service role for server
-- ---------------------------------------------------------------------------
alter table entities enable row level security;
alter table entity_aliases enable row level security;
alter table entity_identifiers enable row level security;
alter table entity_relationships enable row level security;
alter table search_documents enable row level security;
alter table entity_embeddings enable row level security;
alter table watchlists enable row level security;
alter table investigations enable row level security;
alter table investigation_evidence enable row level security;
alter table investigation_notes enable row level security;
alter table alert_rules enable row level security;
alter table alert_events enable row level security;
alter table organisations enable row level security;

create policy deny_anon_entities on entities for all to anon using (false);
create policy deny_anon_entity_aliases on entity_aliases for all to anon using (false);
create policy deny_anon_entity_identifiers on entity_identifiers for all to anon using (false);
create policy deny_anon_entity_relationships on entity_relationships for all to anon using (false);
create policy deny_anon_search_documents on search_documents for all to anon using (false);
create policy deny_anon_entity_embeddings on entity_embeddings for all to anon using (false);
create policy deny_anon_watchlists on watchlists for all to anon using (false);
create policy deny_anon_investigations on investigations for all to anon using (false);
create policy deny_anon_investigation_evidence on investigation_evidence for all to anon using (false);
create policy deny_anon_investigation_notes on investigation_notes for all to anon using (false);
create policy deny_anon_alert_rules on alert_rules for all to anon using (false);
create policy deny_anon_alert_events on alert_events for all to anon using (false);
create policy deny_anon_organisations on organisations for all to anon using (false);

-- Feature flags for Phase 2–4
insert into feature_flags (key, enabled, description) values
  ('hybrid_search', true, 'Indexed search before live connector fan-out'),
  ('opensearch', false, 'OpenSearch full-text index'),
  ('pgvector_search', false, 'Semantic vector search via pgvector'),
  ('investigations', true, 'Investigation workspaces'),
  ('alert_engine', true, 'Cross-domain alert rules'),
  ('gdelt_connector', true, 'GDELT global events feed'),
  ('traffic_provider', false, 'TomTom traffic when TOMTOM_API_KEY set')
on conflict (key) do update set description = excluded.description;
