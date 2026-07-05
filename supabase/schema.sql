-- EarthOS Supabase base schema
-- Run this entire file in: Supabase Dashboard > SQL Editor > New query
-- Then run: supabase/migrations/001_platform_foundation.sql for Phase 1 tables

create table if not exists article_cache (
  id text primary key,
  url text not null,
  title text,
  paragraphs jsonb,
  pdf_url text,
  content_type text not null default 'html',
  fetched_at timestamptz not null default now()
);

create index if not exists article_cache_fetched_at on article_cache (fetched_at desc);

create table if not exists ingested_items (
  id text primary key,
  connector_id text not null,
  module text not null,
  title text not null,
  payload jsonb not null,
  ingested_at timestamptz not null default now()
);

create index if not exists ingested_items_connector on ingested_items (connector_id, ingested_at desc);

create table if not exists event_log (
  id bigserial primary key,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists event_log_type on event_log (type, created_at desc);

create table if not exists bookmarks (
  id text primary key,
  user_id uuid,
  item jsonb not null,
  created_at timestamptz not null default now()
);

alter table article_cache enable row level security;
alter table ingested_items enable row level security;
alter table event_log enable row level security;
alter table bookmarks enable row level security;

drop policy if exists earthos_article_cache_all on article_cache;
create policy earthos_article_cache_all on article_cache
  for all using (true) with check (true);

drop policy if exists earthos_ingested_items_all on ingested_items;
create policy earthos_ingested_items_all on ingested_items
  for all using (true) with check (true);

drop policy if exists earthos_event_log_all on event_log;
create policy earthos_event_log_all on event_log
  for all using (true) with check (true);

drop policy if exists earthos_bookmarks_all on bookmarks;
create policy earthos_bookmarks_all on bookmarks
  for all using (true) with check (true);
