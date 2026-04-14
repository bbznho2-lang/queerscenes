CREATE OR REPLACE FUNCTION public.get_top_content_ids(_limit integer DEFAULT 10)
RETURNS TABLE (content_id uuid, rank bigint, clicks bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      cc.content_id,
      COUNT(*)::bigint AS clicks,
      ROW_NUMBER() OVER (
        ORDER BY COUNT(*) DESC, MAX(cc.clicked_at) DESC, cc.content_id
      ) AS rank
    FROM public.content_clicks cc
    GROUP BY cc.content_id
  )
  SELECT ranked.content_id, ranked.rank, ranked.clicks
  FROM ranked
  WHERE ranked.rank <= GREATEST(COALESCE(_limit, 10), 1)
  ORDER BY ranked.rank;
$$;

REVOKE ALL ON FUNCTION public.get_top_content_ids(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_content_ids(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_top_content_ids(integer) TO authenticated;