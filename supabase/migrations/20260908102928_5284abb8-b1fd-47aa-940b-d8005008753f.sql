CREATE TABLE public.revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  visitor_number bigint,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT ALL ON public.revisions TO service_role;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
CREATE INDEX revisions_status_created_idx ON public.revisions (status, created_at DESC);