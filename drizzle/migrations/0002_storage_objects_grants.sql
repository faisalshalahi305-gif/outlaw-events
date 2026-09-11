GRANT SELECT, INSERT ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.objects TO service_role;
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT ALL ON storage.buckets TO service_role;