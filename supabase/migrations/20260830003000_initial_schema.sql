CREATE TABLE public.blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot INT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.blocks TO anon, authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read blocks" ON public.blocks FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  view_only boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.site_settings
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public enable view only" ON public.site_settings
FOR UPDATE TO anon, authenticated USING (view_only = false) WITH CHECK (view_only = true);

INSERT INTO public.blocks (slot, content) VALUES (1,''),(2,''),(3,''),(4,''),(5,'');
INSERT INTO public.site_settings (id, view_only) VALUES (true, false);

CREATE OR REPLACE FUNCTION public.is_view_only()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT view_only FROM public.site_settings WHERE id), false)
$$;

CREATE POLICY "public insert blocks" ON public.blocks
FOR INSERT TO anon, authenticated WITH CHECK (NOT public.is_view_only());
CREATE POLICY "public update blocks" ON public.blocks
FOR UPDATE TO anon, authenticated USING (NOT public.is_view_only()) WITH CHECK (NOT public.is_view_only());

-- Storage bucket 'block-images' is provisioned via the Storage API (private,
-- accessed through signed URLs).

CREATE POLICY "public read block images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'block-images');
CREATE POLICY "block images insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'block-images' AND NOT public.is_view_only());
CREATE POLICY "public update block images" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'block-images') WITH CHECK (bucket_id = 'block-images');

ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'events';

UPDATE public.blocks SET section = 'events';

ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_slot_key;
CREATE UNIQUE INDEX IF NOT EXISTS blocks_section_slot_key ON public.blocks (section, slot);

INSERT INTO public.blocks (section, slot, content, image_url)
SELECT 'characters', g, '', NULL FROM generate_series(1, 10) g
ON CONFLICT DO NOTHING;

CREATE TABLE public.block_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  path text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX block_images_block_id_position_idx ON public.block_images (block_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_images TO anon, authenticated;
GRANT ALL ON public.block_images TO service_role;

ALTER TABLE public.block_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read block_images" ON public.block_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert block_images" ON public.block_images FOR INSERT TO anon, authenticated WITH CHECK (NOT is_view_only());
CREATE POLICY "public update block_images" ON public.block_images FOR UPDATE TO anon, authenticated USING (NOT is_view_only()) WITH CHECK (NOT is_view_only());
CREATE POLICY "public delete block_images" ON public.block_images FOR DELETE TO anon, authenticated USING (NOT is_view_only());

INSERT INTO public.block_images (block_id, path, position)
SELECT id, image_url, 1 FROM public.blocks WHERE image_url IS NOT NULL AND image_url <> '';

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_block_images_updated_at BEFORE UPDATE ON public.block_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "public delete block images" ON storage.objects;
CREATE POLICY "public delete block images" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'block-images' AND NOT public.is_view_only());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_images TO anon, authenticated;
GRANT SELECT, UPDATE ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.blocks TO service_role;
GRANT ALL ON public.block_images TO service_role;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.blocks REPLICA IDENTITY FULL;
ALTER TABLE public.block_images REPLICA IDENTITY FULL;
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.block_images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

ALTER TABLE public.block_images DROP CONSTRAINT IF EXISTS block_images_block_id_fkey;
ALTER TABLE public.block_images ADD CONSTRAINT block_images_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE CASCADE;

GRANT DELETE ON public.blocks TO anon, authenticated;

DROP POLICY IF EXISTS "public delete blocks" ON public.blocks;
CREATE POLICY "public delete blocks" ON public.blocks FOR DELETE TO anon, authenticated USING (NOT is_view_only());

CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  number bigint GENERATED BY DEFAULT AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  label text
);

GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_credential (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  code_hash text NOT NULL,
  image_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_credential TO service_role;
ALTER TABLE public.admin_credential ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_admin_credential_updated_at
BEFORE UPDATE ON public.admin_credential
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gate_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  visitor_number bigint NOT NULL,
  session_binding_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'revoked')),
  entered_at timestamp with time zone NOT NULL DEFAULT now(),
  attempted_at timestamp with time zone,
  verified_at timestamp with time zone,
  access_token_hash text,
  access_expires_at timestamptz,
  last_seen_at timestamptz
);

GRANT ALL ON public.gate_verifications TO service_role;

ALTER TABLE public.gate_verifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX gate_verifications_entered_at_idx
  ON public.gate_verifications (entered_at DESC);

CREATE INDEX gate_verifications_visitor_id_idx
  ON public.gate_verifications (visitor_id);

CREATE INDEX gate_verifications_status_idx
  ON public.gate_verifications (status, entered_at DESC);

CREATE INDEX gate_verifications_access_token_hash_idx
  ON public.gate_verifications (access_token_hash);

CREATE TABLE public.suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  visitor_number bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.suggestions TO service_role;

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- No credential seed: the FIRST code + image saved through the gate become
-- the one and only official verification credentials.
