-- StudyVerse chat actions + notification foundation
-- Run in Supabase SQL Editor.

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- The app uses body as the canonical chat text. Keep the legacy message
-- column nullable so older database versions cannot block new messages.
ALTER TABLE public.direct_messages
  ALTER COLUMN message DROP NOT NULL;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update their direct messages" ON public.direct_messages;

CREATE POLICY "Users can view their direct messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send direct messages"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own direct messages"
ON public.direct_messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Realtime UPDATE events are needed for Refine/Recall to appear instantly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
END $$;

-- Make sure the notification table accepts the event types used by the app.
-- No trigger is assumed here because notification schemas can differ between
-- existing StudyVerse deployments; the application writes notifications with
-- actor_id/metadata when those columns are present.
NOTIFY pgrst, 'reload schema';
