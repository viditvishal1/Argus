-- User preferences cloud sync (G18)
-- Requires: 008_user_auth_rls.sql

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs_json jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table user_preferences enable row level security;

create policy user_preferences_self on user_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Web Push subscriptions (G19)
create table if not exists push_subscriptions (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_self on push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
