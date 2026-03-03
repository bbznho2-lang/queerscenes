
-- Storage policies for banners bucket (drop first to avoid conflict)
DROP POLICY IF EXISTS "Anyone can view banners" ON storage.objects;
CREATE POLICY "Anyone can view banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Admins can upload banners" ON storage.objects;
CREATE POLICY "Admins can upload banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update banners" ON storage.objects;
CREATE POLICY "Admins can update banners" ON storage.objects FOR UPDATE USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete banners" ON storage.objects;
CREATE POLICY "Admins can delete banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
