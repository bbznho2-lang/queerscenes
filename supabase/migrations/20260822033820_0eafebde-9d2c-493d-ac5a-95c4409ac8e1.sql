CREATE OR REPLACE FUNCTION public.get_top_content_ids(_limit integer DEFAULT 10)
RETURNS TABLE(content_id uuid, rank bigint, clicks bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_month_clicks AS (
    SELECT cc.content_id
    FROM public.content_clicks cc
    JOIN public.contents c ON c.id = cc.content_id
    WHERE cc.clicked_at >= date_trunc('month', now())
      AND c.is_archived = false
  ),
  per_content AS (
    SELECT cmc.content_id, COUNT(*)::bigint AS clicks
    FROM current_month_clicks cmc
    GROUP BY cmc.content_id
  ),
  per_title AS (
    SELECT
      lower(btrim(c.title)) AS title_key,
      SUM(pc.clicks)::bigint AS clicks,
      (ARRAY_AGG(pc.content_id ORDER BY pc.clicks DESC, pc.content_id))[1] AS content_id
    FROM per_content pc
    JOIN public.contents c ON c.id = pc.content_id
    GROUP BY lower(btrim(c.title))
  ),
  ranked AS (
    SELECT
      pt.content_id,
      pt.clicks,
      ROW_NUMBER() OVER (ORDER BY pt.clicks DESC, pt.title_key) AS rank
    FROM per_title pt
  )
  SELECT ranked.content_id, ranked.rank, ranked.clicks
  FROM ranked
  WHERE ranked.rank <= GREATEST(COALESCE(_limit, 10), 1)
  ORDER BY ranked.rank;
$$;

REVOKE ALL ON FUNCTION public.get_top_content_ids(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_content_ids(integer) TO anon, authenticated, service_role;