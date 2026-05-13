-- Fix unique constraint on user_stickers to include team column.
-- Required so the same sticker number can exist across different teams
-- (e.g. MEX1 and FWC1 both have sticker_number = 1).

ALTER TABLE public.user_stickers
  DROP CONSTRAINT IF EXISTS user_stickers_user_id_sticker_number_key;

ALTER TABLE public.user_stickers
  ADD CONSTRAINT user_stickers_user_id_team_sticker_number_key
  UNIQUE (user_id, team, sticker_number);
