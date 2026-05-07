-- Add sticker team and name details to trades
-- Run this in the Supabase SQL Editor

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS initiator_sticker_team TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS initiator_sticker_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS responder_sticker_team TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS responder_sticker_name TEXT NOT NULL DEFAULT '';
