create table if not exists public.mealpreppy_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mealpreppy_states enable row level security;

drop policy if exists "Users can read own state" on public.mealpreppy_states;
create policy "Users can read own state"
on public.mealpreppy_states
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can upsert own state" on public.mealpreppy_states;
create policy "Users can upsert own state"
on public.mealpreppy_states
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
