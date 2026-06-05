
CREATE POLICY "Admins upload dm-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dm-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update dm-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dm-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete dm-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dm-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read dm-media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dm-media');
