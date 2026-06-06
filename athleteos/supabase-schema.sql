-- ============================================================
-- AthleteOS — Supabase Schema
-- Colle ce SQL dans Supabase > SQL Editor > Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text,
  full_name   text,
  avatar_url  text,
  plan        text default 'free',   -- free | premium | pro
  created_at  timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users see own profile"   on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- ── SPORTS ────────────────────────────────────────────────
create table if not exists sports (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade,
  label       text not null,
  icon        text default '🏅',
  color       text default '#4f8ef7',
  is_default  boolean default false,
  created_at  timestamptz default now()
);
alter table sports enable row level security;
create policy "Users manage own sports" on sports for all using (auth.uid() = user_id);

-- ── SESSIONS ──────────────────────────────────────────────
create table if not exists sessions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade,
  sport_id    uuid references sports(id) on delete set null,
  date        date not null,
  duration    int,           -- minutes
  type        text,          -- Push / Pull / Tempo / Match …
  note        text,
  energy      int check (energy between 1 and 10),
  fatigue     int check (fatigue between 1 and 10),
  -- course fields
  distance    numeric,
  pace        text,
  heart_rate  int,
  -- musculation fields
  exercises   jsonb,         -- [{name, sets, reps, weight}, …]
  -- tennis/padel fields
  result      text,
  score_text  text,
  -- football fields
  goals_scored  int,
  assists       int,
  minutes_played int,
  -- extra
  metadata    jsonb,
  created_at  timestamptz default now()
);
alter table sessions enable row level security;
create policy "Users manage own sessions" on sessions for all using (auth.uid() = user_id);

-- ── CALENDAR EVENTS ───────────────────────────────────────
create table if not exists calendar_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade,
  type            text not null,   -- training|match|tournament|competition|objective|spectator
  sport_id        uuid references sports(id) on delete set null,
  title           text not null,
  event_date      date not null,
  event_time      time,
  location        text,
  -- spectator-specific
  spectator_sport text,
  broadcast       text,
  -- extra
  description     text,
  created_at      timestamptz default now()
);
alter table calendar_events enable row level security;
create policy "Users manage own events" on calendar_events for all using (auth.uid() = user_id);

-- ── GOALS ─────────────────────────────────────────────────
create table if not exists goals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade,
  sport_id    uuid references sports(id) on delete set null,
  title       text not null,
  target      numeric not null,
  current     numeric default 0,
  unit        text,
  deadline    date,
  color       text default '#4f8ef7',
  created_at  timestamptz default now()
);
alter table goals enable row level security;
create policy "Users manage own goals" on goals for all using (auth.uid() = user_id);

-- ── JOURNAL ENTRIES ───────────────────────────────────────
create table if not exists journal_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade,
  entry_date  date not null default current_date,
  mood        int check (mood between 1 and 5),
  motivation  int check (motivation between 1 and 10),
  stress      int check (stress between 1 and 10),
  fatigue     int check (fatigue between 1 and 10),
  energy      int check (energy between 1 and 10),
  note        text,
  created_at  timestamptz default now()
);
alter table journal_entries enable row level security;
create policy "Users manage own journal" on journal_entries for all using (auth.uid() = user_id);

-- ── HEALTH DATA ───────────────────────────────────────────
create table if not exists health_data (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade,
  entry_date    date not null default current_date,
  weight        numeric,
  fat_pct       numeric,
  muscle_mass   numeric,
  sleep_hours   numeric,
  hydration_l   numeric,
  created_at    timestamptz default now()
);
alter table health_data enable row level security;
create policy "Users manage own health" on health_data for all using (auth.uid() = user_id);

-- ── INJURIES ──────────────────────────────────────────────
create table if not exists injuries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade,
  zone        text not null,
  level       int check (level between 1 and 5),
  detail      text,
  resolved    boolean default false,
  created_at  timestamptz default now()
);
alter table injuries enable row level security;
create policy "Users manage own injuries" on injuries for all using (auth.uid() = user_id);

-- ── FUNCTION: auto-create profile on signup ───────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  -- Insert default sports
  insert into public.sports (user_id, label, icon, color, is_default) values
    (new.id, 'Musculation', '🏋️', '#4f8ef7', true),
    (new.id, 'Course à pied', '🏃', '#22d3a0', true),
    (new.id, 'Tennis', '🎾', '#a855f7', true),
    (new.id, 'Padel', '🏸', '#f59e0b', true),
    (new.id, 'Football', '⚽', '#f43f5e', true);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
