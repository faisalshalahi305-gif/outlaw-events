-- Revisions: visitor-submitted edits pending admin approval
CREATE TABLE public.revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  visitor_number integer,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX revisions_status_created_idx ON public.revisions (status, created_at DESC);

GRANT ALL ON public.revisions TO service_role;

ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: all access flows through server functions
-- using the service role, guarded by the secret gate/admin check.
CREATE POLICY "service role manages revisions"
ON public.revisions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);