-- Run this once in Supabase SQL Editor.
-- These policies make Edit/Delete work for a user's own messages and
-- allow Delete for me through message_hides.

alter table public.direct_messages enable row level security;
alter table public.room_messages enable row level security;
alter table public.message_hides enable row level security;

-- PRIVATE CHAT --------------------------------------------------------------
drop policy if exists "dm_select_participants" on public.direct_messages;
drop policy if exists "dm_insert_sender" on public.direct_messages;
drop policy if exists "dm_update_sender" on public.direct_messages;
drop policy if exists "dm_delete_sender" on public.direct_messages;

create policy "dm_select_participants"
on public.direct_messages for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "dm_insert_sender"
on public.direct_messages for insert
to authenticated
with check (auth.uid() = sender_id);

create policy "dm_update_sender"
on public.direct_messages for update
to authenticated
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

create policy "dm_delete_sender"
on public.direct_messages for delete
to authenticated
using (auth.uid() = sender_id);

-- ROOM CHAT -----------------------------------------------------------------
drop policy if exists "room_messages_select_members" on public.room_messages;
drop policy if exists "room_messages_insert_members" on public.room_messages;
drop policy if exists "room_messages_update_sender" on public.room_messages;
drop policy if exists "room_messages_delete_sender" on public.room_messages;

create policy "room_messages_select_members"
on public.room_messages for select
to authenticated
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = room_messages.room_id
      and rm.user_id = auth.uid()
  )
);

create policy "room_messages_insert_members"
on public.room_messages for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.room_members rm
    where rm.room_id = room_messages.room_id
      and rm.user_id = auth.uid()
  )
);

create policy "room_messages_update_sender"
on public.room_messages for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "room_messages_delete_sender"
on public.room_messages for delete
to authenticated
using (auth.uid() = user_id);

-- DELETE FOR ME -------------------------------------------------------------
drop policy if exists "message_hides_select_own" on public.message_hides;
drop policy if exists "message_hides_insert_own" on public.message_hides;
drop policy if exists "message_hides_delete_own" on public.message_hides;

create policy "message_hides_select_own"
on public.message_hides for select
to authenticated
using (auth.uid() = user_id);

create policy "message_hides_insert_own"
on public.message_hides for insert
to authenticated
with check (auth.uid() = user_id);

create policy "message_hides_delete_own"
on public.message_hides for delete
to authenticated
using (auth.uid() = user_id);
