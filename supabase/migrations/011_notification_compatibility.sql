-- Notification compatibility for the existing StudyVerse client.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message text;
UPDATE public.notifications SET message = body WHERE message IS NULL;
ALTER TABLE public.notifications ALTER COLUMN message SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.sync_notification_text()
RETURNS trigger LANGUAGE plpgsql AS $$
begin
  if new.body is null then new.body := coalesce(new.message, ''); end if;
  if new.message is null then new.message := coalesce(new.body, ''); end if;
  return new;
end;
$$;
DROP TRIGGER IF EXISTS notifications_text_sync ON public.notifications;
CREATE TRIGGER notifications_text_sync BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_notification_text();

-- Mirror completed room sessions into the streak/history table used by the UI.
-- A concise deterministic summary is generated when a session ends.
CREATE OR REPLACE FUNCTION public.mirror_room_session_to_study_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare minutes integer;
subject_name text;
begin
  minutes := greatest(1, floor(coalesce(new.duration_seconds, 0) / 60.0));
  subject_name := coalesce(nullif(new.subject, ''), 'General Study');
  insert into public.study_sessions(user_id, room_id, subject, started_at, ended_at, duration_seconds, summary)
  values (new.user_id, new.room_id, subject_name, new.started_at, new.ended_at, coalesce(new.duration_seconds, 0),
    format('Completed a %s-minute %s study session.', minutes, subject_name));
  return new;
end;
$$;
DO $$
BEGIN
  IF to_regclass('public.room_sessions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS room_session_study_history ON public.room_sessions;
    CREATE TRIGGER room_session_study_history AFTER INSERT ON public.room_sessions
    FOR EACH ROW EXECUTE FUNCTION public.mirror_room_session_to_study_session();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
