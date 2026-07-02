-- 1. Restrict comment_likes SELECT to authenticated users (hide user_id enumeration from anon)
DROP POLICY IF EXISTS "Anyone can view likes" ON public.comment_likes;
CREATE POLICY "Authenticated can view likes"
  ON public.comment_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Drop the broad public SELECT policy on the banners bucket to prevent listing.
--    The bucket is public, so files remain reachable via their public CDN URLs
--    without needing a storage.objects SELECT policy.
DROP POLICY IF EXISTS "Public read banners bucket" ON storage.objects;