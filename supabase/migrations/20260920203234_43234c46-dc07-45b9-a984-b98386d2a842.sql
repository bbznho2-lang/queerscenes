DROP POLICY IF EXISTS "Anyone can view featured episodes" ON public.featured_episodes;
CREATE POLICY "Anyone can view featured episodes"
ON public.featured_episodes
FOR SELECT
TO anon, authenticated
USING (
  (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = featured_episodes.content_id
      AND c.is_archived = false
  ))
  OR
  (episode_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.episodes e
    JOIN public.contents c ON c.id = e.content_id
    WHERE e.id = featured_episodes.episode_id
      AND c.is_archived = false
  ))
);

DROP POLICY IF EXISTS "Anon can view contents" ON public.contents;
DROP POLICY IF EXISTS "Anyone can view contents" ON public.contents;
CREATE POLICY "Public can view active contents"
ON public.contents
FOR SELECT
TO anon, authenticated
USING (is_archived = false);

DROP POLICY IF EXISTS "Anyone can insert support messages" ON public.support_messages;
CREATE POLICY "Anyone can submit valid support messages"
ON public.support_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 1 AND 100
  AND length(btrim(email)) BETWEEN 3 AND 255
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(btrim(message)) BETWEEN 1 AND 2000
);

DROP POLICY IF EXISTS "Anyone can view comments" ON public.content_comments;
CREATE POLICY "Public can view comments on active contents"
ON public.content_comments
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.contents c
  WHERE c.id = content_comments.content_id
    AND c.is_archived = false
));

DROP POLICY IF EXISTS "Public can read paywall customizations" ON public.paywall_customizations;
CREATE POLICY "Public can read active paywall customizations"
ON public.paywall_customizations
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.contents c
  WHERE c.id = paywall_customizations.content_id
    AND c.is_archived = false
));

DROP POLICY IF EXISTS "Anyone can view active social links" ON public.social_links;
CREATE POLICY "Anyone can view active social links"
ON public.social_links
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Anon can view episodes" ON public.episodes;
DROP POLICY IF EXISTS "Anyone can view episodes" ON public.episodes;
CREATE POLICY "Public can view episodes of active contents"
ON public.episodes
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.contents c
  WHERE c.id = episodes.content_id
    AND c.is_archived = false
));

DROP POLICY IF EXISTS "Anyone can view site notes" ON public.site_notes;
CREATE POLICY "Anyone can view active site notes"
ON public.site_notes
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Read dm-media participants only" ON storage.objects;
CREATE POLICY "Read dm-media participants only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dm-media'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.direct_messages dm
      WHERE dm.media_url = storage.objects.name
        AND dm.recipient_id = auth.uid()
    )
  )
);