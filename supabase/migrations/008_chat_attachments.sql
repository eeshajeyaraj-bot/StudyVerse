-- StudyVerse chat attachments for private and room chat
alter table public.direct_messages add column if not exists attachment_url text;
alter table public.direct_messages add column if not exists attachment_name text;
alter table public.direct_messages add column if not exists attachment_type text;

alter table public.room_messages add column if not exists attachment_url text;
alter table public.room_messages add column if not exists attachment_name text;
alter table public.room_messages add column if not exists attachment_type text;

insert into storage.buckets (id, name, public)
values ('studyverse-chat', 'studyverse-chat', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists "StudyVerse chat uploads" on storage.objects;
drop policy if exists "StudyVerse chat reads" on storage.objects;
drop policy if exists "StudyVerse chat deletes" on storage.objects;

create policy "StudyVerse chat uploads"
on storage.objects for insert to authenticated
with check (bucket_id = 'studyverse-chat' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "StudyVerse chat reads"
on storage.objects for select to authenticated
using (bucket_id = 'studyverse-chat');

create policy "StudyVerse chat deletes"
on storage.objects for delete to authenticated
using (bucket_id = 'studyverse-chat' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';