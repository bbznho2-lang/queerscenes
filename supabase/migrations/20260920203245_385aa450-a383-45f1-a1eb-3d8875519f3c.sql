DROP POLICY IF EXISTS "Admins can view all contents" ON public.contents;
CREATE POLICY "Admins can view all contents"
ON public.contents
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all episodes" ON public.episodes;
CREATE POLICY "Admins can view all episodes"
ON public.episodes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all featured episodes" ON public.featured_episodes;
CREATE POLICY "Admins can view all featured episodes"
ON public.featured_episodes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));