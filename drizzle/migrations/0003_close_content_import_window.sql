DROP POLICY IF EXISTS "temp import blocks" ON public.blocks;
DROP POLICY IF EXISTS "temp import block_images" ON public.block_images;
REVOKE INSERT ON public.blocks FROM anon;
REVOKE INSERT ON public.block_images FROM anon;