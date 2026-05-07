-- Add tutorial flag to profiles
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_tutorial boolean NOT NULL DEFAULT false;
