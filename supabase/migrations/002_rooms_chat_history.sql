-- StudyVerse room chat + room history
-- Run this in Supabase SQL Editor after 001_social.sql.

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists room_messages_room_idx on public.room_messages(room_id, created_at);

create table if not exists public.room_history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.study_rooms(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  room_name text not null,
  room_code text not null,
  max_members integer not null default 5,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists room_history_host_idx on public.room_history(host_id, created_at desc);

-- Keep a permanent history record whenever a room is created.
create or replace function public.record_room_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.room_history(room_id, host_id, room_name, room_code, max_members, created_at)
  values (new.id, new.host_id, new.room_name, new.room_code, new.max_members, coalesce(new.created_at, now()))
  on conflict (room_id) do update set
    room_name = excluded.room_name,
    room_code = excluded.room_code,
    max_members = excluded.max_members;
  return new;
end;
$$;

drop trigger if exists study_room_history_trigger on public.study_rooms;
create trigger study_room_history_trigger
after insert on public.study_rooms
for each row execute function public.record_room_history();

-- Backfill rooms that were created before this migration.
insert into public.room_history(room_id, host_id, room_name, room_code, max_members, created_at)
select id, host_id, room_name, room_code, max_members, coalesce(created_at, now())
from public.study_rooms
on conflict (room_id) do nothing;

alter table public.room_messages enable row level security;
alter table public.room_history enable row level security;

drop policy if exists "room members can read room messages" on public.room_messages;
create policy "room members can read room messages"
on public.room_messages for select to authenticated
using (exists (select 1 from public.room_members rm where rm.room_id = room_messages.room_id and rm.user_id = auth.uid()));

drop policy if exists "room members can send room messages" on public.room_messages;
create policy "room members can send room messages"
on public.room_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (select 1 from public.room_members rm where rm.room_id = room_messages.room_id and rm.user_id = auth.uid())
);

drop policy if exists "users can read their room history" on public.room_history;
create policy "users can read their room history"
on public.room_history for select to authenticated
using (host_id = auth.uid());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_messages') then
    execute 'alter publication supabase_realtime add table public.room_messages';
  end if;
end $$;
