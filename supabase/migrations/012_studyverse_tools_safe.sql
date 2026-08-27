-- Safe recovery migration for StudyVerse study tools.
-- Run this in Supabase SQL Editor if the study-tool tables are missing.
-- This intentionally does not modify room_members policies or message rate-limit triggers.

create extension if not exists pgcrypto;

create table if not exists public.room_pins (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.room_resources (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  resource_type text not null default 'link',
  created_at timestamptz not null default now()
);

create table if not exists public.direct_message_reads (
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.room_message_reads (
  message_id uuid not null references public.room_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.study_rooms(id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.study_rooms(id) on delete set null,
  subject text not null default 'General Study',
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists room_pins_room_idx on public.room_pins(room_id, created_at desc);
create index if not exists room_resources_room_idx on public.room_resources(room_id, created_at desc);
create index if not exists study_sessions_user_created_idx on public.study_sessions(user_id, created_at desc);

alter table public.room_pins enable row level security;
alter table public.room_resources enable row level security;
alter table public.direct_message_reads enable row level security;
alter table public.room_message_reads enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_sessions enable row level security;

-- Pins
 drop policy if exists "room members read pins" on public.room_pins;
create policy "room members read pins" on public.room_pins for select to authenticated
using (exists (select 1 from public.room_members m where m.room_id = room_pins.room_id and m.user_id = auth.uid()));
drop policy if exists "room members create pins" on public.room_pins;
create policy "room members create pins" on public.room_pins for insert to authenticated
with check (created_by = auth.uid() and exists (select 1 from public.room_members m where m.room_id = room_pins.room_id and m.user_id = auth.uid()));
drop policy if exists "pin creator deletes pin" on public.room_pins;
create policy "pin creator deletes pin" on public.room_pins for delete to authenticated using (created_by = auth.uid());

-- Shared resources
 drop policy if exists "room members read resources" on public.room_resources;
create policy "room members read resources" on public.room_resources for select to authenticated
using (exists (select 1 from public.room_members m where m.room_id = room_resources.room_id and m.user_id = auth.uid()));
drop policy if exists "room members create resources" on public.room_resources;
create policy "room members create resources" on public.room_resources for insert to authenticated
with check (added_by = auth.uid() and exists (select 1 from public.room_members m where m.room_id = room_resources.room_id and m.user_id = auth.uid()));
drop policy if exists "resource creator deletes resource" on public.room_resources;
create policy "resource creator deletes resource" on public.room_resources for delete to authenticated using (added_by = auth.uid());

-- Read receipts
 drop policy if exists "users manage own dm reads" on public.direct_message_reads;
create policy "users manage own dm reads" on public.direct_message_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own room reads" on public.room_message_reads;
create policy "users manage own room reads" on public.room_message_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Flashcards
 drop policy if exists "deck owners or room members read decks" on public.flashcard_decks;
create policy "deck owners or room members read decks" on public.flashcard_decks for select to authenticated
using (owner_id = auth.uid() or exists (select 1 from public.room_members m where m.room_id = flashcard_decks.room_id and m.user_id = auth.uid()));
drop policy if exists "users create decks" on public.flashcard_decks;
create policy "users create decks" on public.flashcard_decks for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "deck owners update decks" on public.flashcard_decks;
create policy "deck owners update decks" on public.flashcard_decks for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "deck owners delete decks" on public.flashcard_decks;
create policy "deck owners delete decks" on public.flashcard_decks for delete to authenticated using (owner_id = auth.uid());

 drop policy if exists "deck members read cards" on public.flashcards;
create policy "deck members read cards" on public.flashcards for select to authenticated
using (exists (select 1 from public.flashcard_decks d where d.id = flashcards.deck_id and (d.owner_id = auth.uid() or exists (select 1 from public.room_members m where m.room_id = d.room_id and m.user_id = auth.uid()))));
drop policy if exists "deck owners create cards" on public.flashcards;
create policy "deck owners create cards" on public.flashcards for insert to authenticated
with check (exists (select 1 from public.flashcard_decks d where d.id = flashcards.deck_id and d.owner_id = auth.uid()));
drop policy if exists "deck owners update cards" on public.flashcards;
create policy "deck owners update cards" on public.flashcards for update to authenticated
using (exists (select 1 from public.flashcard_decks d where d.id = flashcards.deck_id and d.owner_id = auth.uid()))
with check (exists (select 1 from public.flashcard_decks d where d.id = flashcards.deck_id and d.owner_id = auth.uid()));
drop policy if exists "deck owners delete cards" on public.flashcards;
create policy "deck owners delete cards" on public.flashcards for delete to authenticated
using (exists (select 1 from public.flashcard_decks d where d.id = flashcards.deck_id and d.owner_id = auth.uid()));

-- Study sessions
 drop policy if exists "users read own sessions" on public.study_sessions;
create policy "users read own sessions" on public.study_sessions for select to authenticated using (user_id = auth.uid());
drop policy if exists "users create own sessions" on public.study_sessions;
create policy "users create own sessions" on public.study_sessions for insert to authenticated with check (user_id = auth.uid());

notify pgrst, 'reload schema';
