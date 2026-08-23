-- StudyVerse chat actions: WhatsApp-style per-user hide + sender-only delete-for-everyone.

create table if not exists public.message_hides (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(message_id, user_id)
);

alter table public.message_hides enable row level security;

drop policy if exists "message_hides_select_own" on public.message_hides;
drop policy if exists "message_hides_insert_own" on public.message_hides;
drop policy if exists "message_hides_delete_own" on public.message_hides;

create policy "message_hides_select_own" on public.message_hides
for select to authenticated using (user_id = auth.uid());
create policy "message_hides_insert_own" on public.message_hides
for insert to authenticated with check (user_id = auth.uid());
create policy "message_hides_delete_own" on public.message_hides
for delete to authenticated using (user_id = auth.uid());

-- Allow a logged-in user to delete only messages they sent (Delete for everyone).
drop policy if exists "direct_messages_delete_sender" on public.direct_messages;
create policy "direct_messages_delete_sender" on public.direct_messages
for delete to authenticated using (sender_id = auth.uid());

-- Private chat attachment bucket. Safe to run repeatedly.
insert into storage.buckets (id, name, public)
values ('studyverse-chat', 'studyverse-chat', false)
on conflict (id) do nothing;

-- Users can upload only inside their own UUID folder.
drop policy if exists "studyverse_chat_upload_own_folder" on storage.objects;
create policy "studyverse_chat_upload_own_folder" on storage.objects
for insert to authenticated
with check (bucket_id = 'studyverse-chat' and (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read chat attachments they uploaded.
drop policy if exists "studyverse_chat_select_own_folder" on storage.objects;
create policy "studyverse_chat_select_own_folder" on storage.objects
for select to authenticated
using (bucket_id = 'studyverse-chat' and (storage.foldername(name))[1] = auth.uid()::text);

-- Users can remove their own uploaded attachments.
drop policy if exists "studyverse_chat_delete_own_folder" on storage.objects;
create policy "studyverse_chat_delete_own_folder" on storage.objects
for delete to authenticated
using (bucket_id = 'studyverse-chat' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
