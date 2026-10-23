-- StudyVerse security hardening: restrict client execution of privileged functions,
-- enforce room membership for message reads/writes, and remove permissive study-session policies.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_room_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.studyverse_rate_limit_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.studyverse_rate_limit_room_message() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.search_studyverse_users(text, uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.search_studyverse_users(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_studyverse_users(text, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can read room messages" ON public.room_messages;
DROP POLICY IF EXISTS "Users can view room messages" ON public.room_messages;
DROP POLICY IF EXISTS "Members can send room messages" ON public.room_messages;
DROP POLICY IF EXISTS "Users can send room messages" ON public.room_messages;

CREATE POLICY "room members read messages"
ON public.room_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_messages.room_id
      AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "room members send as self"
ON public.room_messages FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_messages.room_id
      AND rm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.study_sessions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.study_sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.study_sessions;
DROP POLICY IF EXISTS "Policy with table joins" ON public.study_sessions;

NOTIFY pgrst, 'reload schema';
