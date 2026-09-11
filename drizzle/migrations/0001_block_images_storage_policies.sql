-- Visitors may only upload new files to the block-images bucket.
-- Reading happens through server-generated signed URLs, so no anon SELECT is needed.
CREATE POLICY "upload block images" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'block-images');