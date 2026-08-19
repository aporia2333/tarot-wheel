-- Run this migration in the Supabase SQL Editor before enabling cloud history.
-- Every row belongs to exactly one authenticated Supabase user.
create table if not exists public.tarot_readings (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  encrypted_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tarot_readings_user_created_at_idx
  on public.tarot_readings (user_id, created_at desc);

alter table public.tarot_readings enable row level security;

-- Do not rely on client-side filtering. These policies apply to every query,
-- including a request where someone guesses another reading's id.
drop policy if exists "Users can view their own tarot readings" on public.tarot_readings;
create policy "Users can view their own tarot readings"
  on public.tarot_readings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own tarot readings" on public.tarot_readings;
create policy "Users can create their own tarot readings"
  on public.tarot_readings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tarot readings" on public.tarot_readings;
create policy "Users can update their own tarot readings"
  on public.tarot_readings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tarot readings" on public.tarot_readings;
create policy "Users can delete their own tarot readings"
  on public.tarot_readings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Keep updated_at accurate without giving users extra privileges.
create or replace function public.set_tarot_readings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tarot_readings_set_updated_at on public.tarot_readings;
create trigger tarot_readings_set_updated_at
  before update on public.tarot_readings
  for each row execute function public.set_tarot_readings_updated_at();
