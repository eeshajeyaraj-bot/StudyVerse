-- StudyVerse RLS hardening
-- Repeat-safe so it can be applied after an earlier manual policy rollout.

do $$ begin
  drop policy if exists activity_feed_select_own on public.activity_feed;
  drop policy if exists activity_feed_insert_own on public.activity_feed;
  drop policy if exists friend_requests_select_participants on public.friend_requests;
  drop policy if exists friend_requests_insert_sender on public.friend_requests;
  drop policy if exists friend_requests_update_participants on public.friend_requests;
  drop policy if exists friend_requests_delete_participants on public.friend_requests;
  drop policy if exists room_files_select_member on public.room_files;
  drop policy if exists room_files_insert_member on public.room_files;
  drop policy if exists room_files_update_owner on public.room_files;
  drop policy if exists room_files_delete_owner on public.room_files;
  drop policy if exists study_status_select_own on public.study_status;
  drop policy if exists study_status_insert_own on public.study_status;
  drop policy if exists study_status_update_own on public.study_status;
  drop policy if exists study_status_delete_own on public.study_status;
end $$;

create policy activity_feed_select_own on public.activity_feed for select to authenticated using (user_id = auth.uid());
create policy activity_feed_insert_own on public.activity_feed for insert to authenticated with check (user_id = auth.uid());

create policy friend_requests_select_participants on public.friend_requests for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy friend_requests_insert_sender on public.friend_requests for insert to authenticated with check (sender_id = auth.uid());
create policy friend_requests_update_participants on public.friend_requests for update to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid()) with check (sender_id = auth.uid() or receiver_id = auth.uid());
create policy friend_requests_delete_participants on public.friend_requests for delete to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy room_files_select_member on public.room_files for select to authenticated using (exists (select 1 from public.room_members rm where rm.room_id = room_files.room_id and rm.user_id = auth.uid()));
create policy room_files_insert_member on public.room_files for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.room_members rm where rm.room_id = room_files.room_id and rm.user_id = auth.uid()));
create policy room_files_update_owner on public.room_files for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy room_files_delete_owner on public.room_files for delete to authenticated using (user_id = auth.uid());

create policy study_status_select_own on public.study_status for select to authenticated using (user_id = auth.uid());
create policy study_status_insert_own on public.study_status for insert to authenticated with check (user_id = auth.uid());
create policy study_status_update_own on public.study_status for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy study_status_delete_own on public.study_status for delete to authenticated using (user_id = auth.uid());
