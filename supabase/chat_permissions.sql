-- Run this once in Supabase SQL Editor.
-- It fixes the RLS permission errors behind Edit, Delete and Delete for me/everyone.

-- PRIVATE CHAT: hide a message only for the current user.
create table if not exists public.message_hides (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

alter table public.message_hides enable row level security;
drop policy if exists "message_hides_select_own" on public.message_hides;
drop policy if exists "message_hides_insert_own" on public.message_hides;
drop policy if exists "message_hides_delete_own" on public.message_hides;
create policy "message_hides_select_own" on public.message_hides for select using (user_id = auth.uid());
create policy "message_hides_insert_own" on public.message_hides for insert with check (user_id = auth.uid());
create policy "message_hides_delete_own" on public.message_hides for delete using (user_id = auth.uid());

-- PRIVATE CHAT: sender can edit and delete their own messages.
drop policy if exists "direct_messages_update_sender" on public.direct_messages;
drop policy if exists "direct_messages_delete_sender" on public.direct_messages;
create policy "direct_messages_update_sender" on public.direct_messages for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy "direct_messages_delete_sender" on public.direct_messages for delete using (sender_id = auth.uid());

-- ROOM CHAT: members can send; authors can edit/delete their own messages.
drop policy if exists "room_messages_update_author" on public.room_messages;
drop policy if exists "room_messages_delete_author" on public.room_messages;
create policy "room_messages_update_author" on public.room_messages for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "room_messages_delete_author" on public.room_messages for delete using (user_id = auth.uid());

-- Make sure realtime DELETE/UPDATE events can be observed when realtime is enabled.
do $$
begin
  alter table public.direct_messages replica identity full;
exception when others then null;
end $$;

do $$
begin
  alter table public.room_messages replica identity full;
exception when others then null;
end $$;
