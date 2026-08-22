-- StudyVerse calendar: tasks plus user-created calendar events
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  event_type text not null default 'study' check (event_type in ('task','assignment','exam','study','room','deadline','journal')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_user_date_idx on public.calendar_events(user_id, starts_at);

alter table public.calendar_events enable row level security;

drop policy if exists "users read own calendar events" on public.calendar_events;
create policy "users read own calendar events" on public.calendar_events for select to authenticated using (user_id = auth.uid());
drop policy if exists "users create own calendar events" on public.calendar_events;
create policy "users create own calendar events" on public.calendar_events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users update own calendar events" on public.calendar_events;
create policy "users update own calendar events" on public.calendar_events for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users delete own calendar events" on public.calendar_events;
create policy "users delete own calendar events" on public.calendar_events for delete to authenticated using (user_id = auth.uid());

drop trigger if exists calendar_events_updated_at on public.calendar_events;
create trigger calendar_events_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();
