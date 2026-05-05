-- ============================================================
-- StickerSwap — FIFA World Cup 2026
-- Full Schema — Run this in Supabase SQL Editor
-- ============================================================

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  user_id uuid unique not null references auth.users on delete cascade,
  username text not null unique,
  bio text,
  avatar_url text,
  age integer,
  latitude float not null default 0,
  longitude float not null default 0,
  search_radius_km integer not null default 50,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- USER STICKERS (WC 2026 album tracking)
create table if not exists public.user_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sticker_number integer not null,
  sticker_name text not null default '',
  team text not null default '',
  status text not null default 'have' check (status in ('have', 'need', 'have_duplicate')),
  created_at timestamptz default now() not null,
  unique(user_id, sticker_number)
);

-- TRADES
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  initiator_id uuid not null references auth.users on delete cascade,
  responder_id uuid not null references auth.users on delete cascade,
  initiator_sticker_number integer not null default 0,
  responder_sticker_number integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'rejected')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- MESSAGES
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades on delete cascade,
  sender_id uuid not null references auth.users on delete cascade,
  content text not null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_stickers enable row level security;
alter table public.trades enable row level security;
alter table public.messages enable row level security;

-- ============================================================
-- RLS POLICIES — PROFILES
-- ============================================================
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES — USER STICKERS
-- ============================================================
drop policy if exists "stickers_select_all" on public.user_stickers;
create policy "stickers_select_all" on public.user_stickers for select using (true);

drop policy if exists "stickers_insert_own" on public.user_stickers;
create policy "stickers_insert_own" on public.user_stickers for insert with check (auth.uid() = user_id);

drop policy if exists "stickers_update_own" on public.user_stickers;
create policy "stickers_update_own" on public.user_stickers for update using (auth.uid() = user_id);

drop policy if exists "stickers_delete_own" on public.user_stickers;
create policy "stickers_delete_own" on public.user_stickers for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES — TRADES
-- ============================================================
drop policy if exists "trades_select_involved" on public.trades;
create policy "trades_select_involved" on public.trades for select
  using (auth.uid() = initiator_id or auth.uid() = responder_id);

drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own" on public.trades for insert
  with check (auth.uid() = initiator_id);

drop policy if exists "trades_update_involved" on public.trades;
create policy "trades_update_involved" on public.trades for update
  using (auth.uid() = initiator_id or auth.uid() = responder_id);

-- ============================================================
-- RLS POLICIES — MESSAGES
-- ============================================================
drop policy if exists "messages_select_involved" on public.messages;
create policy "messages_select_involved" on public.messages for select
  using (
    exists (
      select 1 from public.trades
      where trades.id = messages.trade_id
        and (trades.initiator_id = auth.uid() or trades.responder_id = auth.uid())
    )
  );

drop policy if exists "messages_insert_involved" on public.messages;
create policy "messages_insert_involved" on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.trades
      where trades.id = messages.trade_id
        and (trades.initiator_id = auth.uid() or trades.responder_id = auth.uid())
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at_column();

drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at before update on public.trades
  for each row execute function update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists user_stickers_user_id_idx on public.user_stickers(user_id);
create index if not exists user_stickers_number_idx on public.user_stickers(sticker_number);
create index if not exists trades_initiator_idx on public.trades(initiator_id);
create index if not exists trades_responder_idx on public.trades(responder_id);
create index if not exists messages_trade_id_idx on public.messages(trade_id);

-- ============================================================
-- Enable Realtime for messages
-- ============================================================
alter publication supabase_realtime add table public.messages;
