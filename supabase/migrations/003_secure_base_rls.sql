-- Secure base schema RLS (Phase 0 remediation)
-- Run after schema.sql — replaces open policies with deny-by-default for client roles

drop policy if exists earthos_article_cache_all on article_cache;
drop policy if exists earthos_ingested_items_all on ingested_items;
drop policy if exists earthos_event_log_all on event_log;
drop policy if exists earthos_bookmarks_all on bookmarks;

create policy deny_anon_article_cache on article_cache for all to anon using (false);
create policy deny_anon_ingested_items on ingested_items for all to anon using (false);
create policy deny_anon_event_log on event_log for all to anon using (false);
create policy deny_anon_bookmarks on bookmarks for all to anon using (false);

-- Authenticated users read own bookmarks only (Phase 2 auth wires user_id)
create policy bookmarks_select_own on bookmarks
  for select to authenticated using (auth.uid() = user_id);

create policy bookmarks_insert_own on bookmarks
  for insert to authenticated with check (auth.uid() = user_id);

create policy bookmarks_delete_own on bookmarks
  for delete to authenticated using (auth.uid() = user_id);
