-- StudyVerse social/profile RLS repair
-- Run this ONCE in Supabase SQL Editor.
-- It fixes profile directory search, profile edits, avatar uploads,
-- friend requests and direct-message access without disabling RLS.

-- PROFILES ---------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- AVATARS STORAGE --------------------------------------------------------
-- The app expects a public bucket called avatars and stores files under
-- <auth-user-id>/... so ownership can be enforced by the first path segment.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_owner_insert" on storage.objects;
drop policy if exists "avatars_owner_update" on storage.objects;
drop policy if exists "avatars_owner_delete" on storage.objects;

create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- FRIENDSHIPS ------------------------------------------------------------
alter table public.friendships enable row level security;

drop policy if exists "friendships_select_participant" on public.friendships;
drop policy if exists "friendships_insert_requester" on public.friendships;
drop policy if exists "friendships_update_participant" on public.friendships;
drop policy if exists "friendships_delete_participant" on public.friendships;

create policy "friendships_select_participant"
on public.friendships for select
to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "friendships_insert_requester"
on public.friendships for insert
to authenticated
with check (requester_id = auth.uid());

create policy "friendships_update_participant"
on public.friendships for update
to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid())
with check (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "friendships_delete_participant"
on public.friendships for delete
to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid());

-- DIRECT MESSAGES --------------------------------------------------------
alter table public.direct_messages enable row level security;

drop policy if exists "direct_messages_select_participant" on public.direct_messages;
drop policy if exists "direct_messages_insert_sender" on public.direct_messages;
drop policy if exists "direct_messages_update_sender" on public.direct_messages;
drop policy if exists "direct_messages_delete_sender" on public.direct_messages;

create policy "direct_messages_select_participant"
on public.direct_messages for select
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "direct_messages_insert_sender"
on public.direct_messages for insert
to authenticated
with check (sender_id = auth.uid());

create policy "direct_messages_update_sender"
on public.direct_messages for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

create policy "direct_messages_delete_sender"
on public.direct_messages for delete
to authenticated
using (sender_id = auth.uid());

-- NOTIFICATIONS ----------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_actor" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_select_own"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_insert_actor"
on public.notifications for insert
to authenticated
with check (actor_id is null or actor_id = auth.uid());

create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notifications_delete_own"
on public.notifications for delete
to authenticated
using (user_id = auth.uid());
