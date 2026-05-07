-- Add 'canceled' as a valid trade status
-- Run this in the Supabase SQL Editor

-- Drop existing check constraint and re-add with 'canceled' included
-- (constraint name may differ — check yours with \d trades)
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_status_check;
ALTER TABLE public.trades
  ADD CONSTRAINT trades_status_check
  CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'canceled'));

-- If status uses an enum type instead, run this:
-- ALTER TYPE public.trade_status ADD VALUE IF NOT EXISTS 'canceled';
