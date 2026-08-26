-- Notification compatibility for the existing StudyVerse client.
-- The original notification table uses body while older client code writes/reads message.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message text;
UPDATE public.notifications SET message = body WHERE message IS NULL;
ALTER TABLE public.notifications ALTER COLUMN message SET DEFAULT '';

-- Keep both fields in sync for old and new client code.
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

NOTIFY pgrst, 'reload schema';
