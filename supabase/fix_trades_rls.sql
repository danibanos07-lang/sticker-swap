-- Fix trades RLS and status constraint so both parties can cancel
-- Run this in the Supabase SQL Editor

-- 1. Allow 'canceled' as a valid status value
--    (Drop whatever the existing check constraint is named and recreate it)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.trades'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.trades DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_status_check
  CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'canceled'));

-- 2. Fix RLS so both the initiator AND the responder can update a trade
--    (previously only the responder could update, blocking initiator from canceling)
DROP POLICY IF EXISTS "Users can update their trades" ON public.trades;
DROP POLICY IF EXISTS "Responders can update trade status" ON public.trades;
DROP POLICY IF EXISTS "trade parties can update" ON public.trades;
DROP POLICY IF EXISTS "initiator or responder can update" ON public.trades;

CREATE POLICY "trade parties can update" ON public.trades
  FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = responder_id)
  WITH CHECK (auth.uid() = initiator_id OR auth.uid() = responder_id);
