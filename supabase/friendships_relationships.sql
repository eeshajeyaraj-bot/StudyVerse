-- StudyVerse: repair friendships -> profiles relationships
-- Run this once in Supabase SQL Editor.

ALTER TABLE public.friendships
  ADD COLUMN IF NOT EXISTS nickname text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'friendships_user_id_fkey'
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'friendships_friend_id_fkey'
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_friend_id_fkey
      FOREIGN KEY (friend_id) REFERENCES public.profiles(id)
      NOT VALID;
  END IF;
END $$;

-- Tell PostgREST/Supabase to refresh its schema cache immediately.
NOTIFY pgrst, 'reload schema';
