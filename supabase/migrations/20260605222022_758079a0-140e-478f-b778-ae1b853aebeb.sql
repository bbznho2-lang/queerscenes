DROP POLICY IF EXISTS "Authenticated read dm-media" ON storage.objects;

CREATE POLICY "Read dm-media participants only"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dm-media'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = 'broadcast'
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );