-- Add Free vs Supporter player URLs (player_url stays as legacy/free fallback; add a new premium one)
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS player_url_free text,
  ADD COLUMN IF NOT EXISTS player_url_premium text;

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS player_url_free text,
  ADD COLUMN IF NOT EXISTS player_url_premium text;

-- Comments table (per content title)
CREATE TABLE IF NOT EXISTS public.content_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid NOT NULL,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'User',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_comments_content_id
  ON public.content_comments (content_id, created_at DESC);

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON public.content_comments;
CREATE POLICY "Anyone can view comments"
ON public.content_comments
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert own comments" ON public.content_comments;
CREATE POLICY "Authenticated can insert own comments"
ON public.content_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.content_comments;
CREATE POLICY "Users can delete own comments"
ON public.content_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any comment" ON public.content_comments;
CREATE POLICY "Admins can delete any comment"
ON public.content_comments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));