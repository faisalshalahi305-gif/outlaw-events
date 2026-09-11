ALTER TABLE public.streamers
  ADD COLUMN IF NOT EXISTS removal_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS removal_visitor_number bigint;