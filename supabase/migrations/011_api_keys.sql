-- User API keys (G37)
-- Requires: 008_user_auth_rls.sql

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_user_id_idx on api_keys(user_id);
create index if not exists api_keys_hash_idx on api_keys(key_hash) where revoked_at is null;

alter table api_keys enable row level security;

create policy api_keys_self on api_keys
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
