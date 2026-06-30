-- NIYYAH Supabase backend setup v1
-- Run this in Supabase SQL Editor after Auth providers are configured.
-- This creates user-owned tables and strict row-level security policies.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'NIYYAH User',
  username text not null,
  email text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 2 and 30),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]+$')
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ayah_id text not null,
  reference text not null,
  prompt text,
  reflection text,
  dua text,
  action text,
  mood text,
  mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorite_ayahs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ayah_id text not null,
  reference text not null,
  translation text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ayah_id)
);

create table if not exists public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null,
  word text not null,
  meaning text,
  context text,
  example_ayah text,
  note text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, word_key)
);

create table if not exists public.study_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  invite_code text not null unique,
  surah_number integer,
  current_ayah_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.study_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id),
  constraint circle_members_role check (role in ('owner', 'member'))
);

alter table public.profiles enable row level security;
alter table public.reflections enable row level security;
alter table public.favorite_ayahs enable row level security;
alter table public.vocabulary_words enable row level security;
alter table public.study_circles enable row level security;
alter table public.circle_members enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "reflections_crud_own" on public.reflections;
create policy "reflections_crud_own" on public.reflections
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "favorite_ayahs_crud_own" on public.favorite_ayahs;
create policy "favorite_ayahs_crud_own" on public.favorite_ayahs
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "vocabulary_words_crud_own" on public.vocabulary_words;
create policy "vocabulary_words_crud_own" on public.vocabulary_words
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "study_circles_owner_crud" on public.study_circles;
create policy "study_circles_owner_crud" on public.study_circles
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "study_circles_member_select" on public.study_circles;
create policy "study_circles_member_select" on public.study_circles
for select to authenticated
using (
  exists (
    select 1 from public.circle_members
    where circle_members.circle_id = study_circles.id
      and circle_members.user_id = (select auth.uid())
  )
);

drop policy if exists "circle_members_select_own_circles" on public.circle_members;
create policy "circle_members_select_own_circles" on public.circle_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.study_circles
    where study_circles.id = circle_members.circle_id
      and study_circles.owner_id = (select auth.uid())
  )
);

drop policy if exists "circle_members_insert_self" on public.circle_members;
create policy "circle_members_insert_self" on public.circle_members
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "circle_members_delete_self_or_owner" on public.circle_members;
create policy "circle_members_delete_self_or_owner" on public.circle_members
for delete to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.study_circles
    where study_circles.id = circle_members.circle_id
      and study_circles.owner_id = (select auth.uid())
  )
);

