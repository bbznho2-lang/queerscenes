DROP POLICY IF EXISTS "Admins can view all social links" ON public.social_links;
CREATE POLICY "Admins can view all social links"
ON public.social_links
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all site notes" ON public.site_notes;
CREATE POLICY "Admins can view all site notes"
ON public.site_notes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));