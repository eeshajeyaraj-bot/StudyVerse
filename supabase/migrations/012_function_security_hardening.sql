-- StudyVerse security hardening.
-- These functions are used by triggers/internal database workflows and should not
-- be callable through the public PostgREST RPC surface.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_room_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.studyverse_rate_limit_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.studyverse_rate_limit_room_message() FROM PUBLIC, anon, authenticated;

-- User search is an intentional authenticated RPC used by the Friends flow.
-- Anonymous callers must not be able to invoke it.
REVOKE EXECUTE ON FUNCTION public.search_studyverse_users(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_studyverse_users(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
