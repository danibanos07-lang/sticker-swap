-- ============================================================
-- Friend Requests — run this in Supabase SQL Editor
-- ============================================================

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users on delete cascade,
  receiver_id uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now() not null,
  unique(sender_id, receiver_id)
);

alter table public.friend_requests enable row level security;

drop policy if exists "friend_requests_select" on public.friend_requests;
create policy "friend_requests_select" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "friend_requests_insert" on public.friend_requests;
create policy "friend_requests_insert" on public.friend_requests
  for insert with check (auth.uid() = sender_id);

drop policy if exists "friend_requests_update" on public.friend_requests;
create policy "friend_requests_update" on public.friend_requests
  for update using (auth.uid() = receiver_id or auth.uid() = sender_id);

create index if not exists friend_requests_sender_idx on public.friend_requests(sender_id);
create index if not exists friend_requests_receiver_idx on public.friend_requests(receiver_id);
