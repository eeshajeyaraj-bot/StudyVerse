-- Ensure every existing authenticated account is searchable in Friends.
insert into public.profiles (id, display_name, username, emoji_avatar, age_range)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'display_name',''), split_part(coalesce(u.email, 'student@example.com'), '@', 1), 'StudyVerse member'),
  nullif(lower(coalesce(u.raw_user_meta_data->>'username', split_part(coalesce(u.email, ''), '@', 1))), ''),
  coalesce(nullif(u.raw_user_meta_data->>'emoji_avatar',''), '👤'),
  nullif(u.raw_user_meta_data->>'age_range','')
from auth.users u
on conflict (id) do update set
  display_name = case when public.profiles.display_name = 'StudyVerse member' then excluded.display_name else public.profiles.display_name end,
  username = coalesce(public.profiles.username, excluded.username),
  emoji_avatar = coalesce(public.profiles.emoji_avatar, excluded.emoji_avatar),
  age_range = coalesce(public.profiles.age_range, excluded.age_range);

alter table public.profiles enable row level security;
drop policy if exists "profiles readable to signed in users" on public.profiles;
create policy "profiles readable to signed in users" on public.profiles for select to authenticated using (true);
