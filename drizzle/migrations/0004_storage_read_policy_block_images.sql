drop policy if exists "read block images" on storage.objects;
create policy "read block images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'block-images');