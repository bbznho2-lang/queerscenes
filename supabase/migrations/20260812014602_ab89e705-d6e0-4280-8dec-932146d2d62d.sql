DROP POLICY IF EXISTS "Authenticated can view likes" ON public.comment_likes;

CREATE POLICY "Users can view their own likes"
ON public.comment_likes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_comment_like_counts(_comment_ids uuid[])
RETURNS TABLE(comment_id uuid, likes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cl.comment_id, count(*)::bigint
  FROM public.comment_likes cl
  WHERE cl.comment_id = ANY(_comment_ids)
  GROUP BY cl.comment_id
$$;

GRANT EXECUTE ON FUNCTION public.get_comment_like_counts(uuid[]) TO anon, authenticated;