-- StudyVerse: room history + persistent notifications
-- Run this file once in Supabase SQL Editor.

create table if not exists public.room_history (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.study_rooms(id) on delete set null,
  room_name text not null,
  room_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists room_history_host_created_idx
  on public.room_history(host_id, created_at desc);

alter table public.room_history enable row level security;

drop policy if exists "Users can read their room history" on public.room_history;
drop policy if exists "Users can create their room history" on public.room_history;

create policy "Users can read their room history"
on public.room_history for select to authenticated
using (host_id = auth.uid());

create policy "Users can create their room history"
on public.room_history for insert to authenticated
with check (host_id = auth.uid());

-- Avoid duplicate history rows for the same created room.
create unique index if not exists room_history_room_unique_idx
  on public.room_history(room_id)
  where room_id is not null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read)
  where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
drop policy if exists "Users can mark their notifications read" on public.notifications;
drop policy if exists "Authenticated users can create notifications" on public.notifications;

create policy "Users can read their notifications"
on public.notifications for select to authenticated
using (user_id = auth.uid());

create policy "Users can mark their notifications read"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Authenticated users can create notifications"
on public.notifications for insert to authenticated
with check (actor_id = auth.uid() or actor_id is null);

-- Enable realtime delivery for the notification center.
alter publication supabase_realtime add table public.notifications;

-- Backfill history for rooms already created by users.
insert into public.room_history (host_id, room_id, room_name, room_code, created_at)
select r.host_id, r.id, r.room_name, r.room_code, r.created_at
from public.study_rooms r
where not exists (
  select 1 from public.room_history h where h.room_id = r.id
);

notify pgrst, 'reload schema';
