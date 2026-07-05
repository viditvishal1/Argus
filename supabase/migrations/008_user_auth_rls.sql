-- Phase 2: Supabase Auth profiles, owner-scoped rows, authenticated RLS

-- ---------------------------------------------------------------------------
-- Profiles (mirror auth.users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy profiles_self_select on profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_self_update on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Owner columns for user-scoped resources
-- ---------------------------------------------------------------------------
alter table investigations add column if not exists owner_id uuid references auth.users(id);
alter table watchlists add column if not exists owner_id uuid references auth.users(id);
alter table alert_rules add column if not exists owner_id uuid references auth.users(id);

create index if not exists idx_investigations_owner on investigations(owner_id);
create index if not exists idx_watchlists_owner on watchlists(owner_id);
create index if not exists idx_alert_rules_owner on alert_rules(owner_id);

-- ---------------------------------------------------------------------------
-- Investigations — owner policies (service role bypasses RLS)
-- ---------------------------------------------------------------------------
drop policy if exists deny_anon_investigations on investigations;
drop policy if exists investigations_owner_select on investigations;
drop policy if exists investigations_owner_insert on investigations;
drop policy if exists investigations_owner_update on investigations;
drop policy if exists investigations_owner_delete on investigations;

create policy investigations_owner_select on investigations
  for select to authenticated using (owner_id = auth.uid());

create policy investigations_owner_insert on investigations
  for insert to authenticated with check (owner_id = auth.uid());

create policy investigations_owner_update on investigations
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy investigations_owner_delete on investigations
  for delete to authenticated using (owner_id = auth.uid());

-- Child tables scoped via parent investigation
drop policy if exists deny_anon_investigation_evidence on investigation_evidence;
drop policy if exists investigation_evidence_owner_select on investigation_evidence;
drop policy if exists investigation_evidence_owner_insert on investigation_evidence;
drop policy if exists investigation_evidence_owner_delete on investigation_evidence;

create policy investigation_evidence_owner_select on investigation_evidence
  for select to authenticated using (
    exists (select 1 from investigations i where i.id = investigation_id and i.owner_id = auth.uid())
  );

create policy investigation_evidence_owner_insert on investigation_evidence
  for insert to authenticated with check (
    exists (select 1 from investigations i where i.id = investigation_id and i.owner_id = auth.uid())
  );

create policy investigation_evidence_owner_delete on investigation_evidence
  for delete to authenticated using (
    exists (select 1 from investigations i where i.id = investigation_id and i.owner_id = auth.uid())
  );

drop policy if exists deny_anon_investigation_notes on investigation_notes;
drop policy if exists investigation_notes_owner_select on investigation_notes;
drop policy if exists investigation_notes_owner_insert on investigation_notes;
drop policy if exists investigation_notes_owner_delete on investigation_notes;

create policy investigation_notes_owner_select on investigation_notes
  for select to authenticated using (
    exists (select 1 from investigations i where i.id = investigation_id and i.owner_id = auth.uid())
  );

create policy investigation_notes_owner_insert on investigation_notes
  for insert to authenticated with check (
    exists (select 1 from investigations i where i.id = investigation_id and i.owner_id = auth.uid())
  );

create policy investigation_notes_owner_delete on investigation_notes
  for delete to authenticated using (
    exists (select 1 from investigations i where i.id = investigation_id and i.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Watchlists
-- ---------------------------------------------------------------------------
drop policy if exists deny_anon_watchlists on watchlists;
drop policy if exists watchlists_owner_select on watchlists;
drop policy if exists watchlists_owner_insert on watchlists;
drop policy if exists watchlists_owner_update on watchlists;
drop policy if exists watchlists_owner_delete on watchlists;

create policy watchlists_owner_select on watchlists
  for select to authenticated using (owner_id = auth.uid());

create policy watchlists_owner_insert on watchlists
  for insert to authenticated with check (owner_id = auth.uid());

create policy watchlists_owner_update on watchlists
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy watchlists_owner_delete on watchlists
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Alert rules (per-user; global defaults remain service-role only)
-- ---------------------------------------------------------------------------
drop policy if exists deny_anon_alert_rules on alert_rules;
drop policy if exists alert_rules_owner_select on alert_rules;
drop policy if exists alert_rules_owner_insert on alert_rules;
drop policy if exists alert_rules_owner_update on alert_rules;
drop policy if exists alert_rules_owner_delete on alert_rules;

create policy alert_rules_owner_select on alert_rules
  for select to authenticated using (owner_id = auth.uid());

create policy alert_rules_owner_insert on alert_rules
  for insert to authenticated with check (owner_id = auth.uid());

create policy alert_rules_owner_update on alert_rules
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy alert_rules_owner_delete on alert_rules
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Dashboards + panel instances (cloud layout sync)
-- ---------------------------------------------------------------------------
drop policy if exists dashboards_owner_all on dashboards;
create policy dashboards_owner_all on dashboards
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists panel_instances_owner_all on panel_instances;
create policy panel_instances_owner_all on panel_instances
  for all to authenticated
  using (
    exists (select 1 from dashboards d where d.id = dashboard_id and d.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from dashboards d where d.id = dashboard_id and d.owner_id = auth.uid())
  );
