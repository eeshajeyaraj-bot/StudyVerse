-- StudyVerse social foundation: profiles, friendships, nicknames and realtime direct chat
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'StudyVerse member',
  username text unique,
  bio text not null default '',
  study_goal text not null default '',
  profile_picture_url text,
  emoji_avatar text not null default '👤',
  status text not null default 'Available' check (status in ('Studying','Busy','Available','Away','Invisible')),
  age_range text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(lower(username));
create index if not exists friendships_recipient_idx on public.friendships(recipient_id, status);
create index if not exists friendships_requester_idx on public.friendships(requester_id, status);
create index if not exists direct_messages_pair_idx on public.direct_messages(sender_id, recipient_id, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists friendships_updated_at on public.friendships;
create trigger friendships_updated_at before update on public.friendships for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, username, emoji_avatar, age_range)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'StudyVerse member'),
    nullif(lower(new.raw_user_meta_data->>'username'), ''),
    coalesce(nullif(new.raw_user_meta_data->>'emoji_avatar',''), '👤'),
    nullif(new.raw_user_meta_data->>'age_range','')
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    username = coalesce(excluded.username, public.profiles.username),
    emoji_avatar = excluded.emoji_avatar,
    age_range = excluded.age_range;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "profiles readable to signed in users" on public.profiles;
create policy "profiles readable to signed in users" on public.profiles for select to authenticated using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "users read own friendships" on public.friendships;
create policy "users read own friendships" on public.friendships for select to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "users create friendship requests" on public.friendships;
create policy "users create friendship requests" on public.friendships for insert to authenticated with check (requester_id = auth.uid());
drop policy if exists "users update own friendship" on public.friendships;
create policy "users update own friendship" on public.friendships for update to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid()) with check (requester_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "users delete own friendship" on public.friendships;
create policy "users delete own friendship" on public.friendships for delete to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "users read own direct messages" on public.direct_messages;
create policy "users read own direct messages" on public.direct_messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "users send direct messages" on public.direct_messages;
create policy "users send direct messages" on public.direct_messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.friendships f where f.status = 'accepted' and ((f.requester_id = auth.uid() and f.recipient_id = direct_messages.recipient_id) or (f.recipient_id = auth.uid() and f.requester_id = direct_messages.recipient_id))));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    execute 'alter publication supabase_realtime add table public.friendships';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    execute 'alter publication supabase_realtime add table public.direct_messages';
  end if;
end $$;
