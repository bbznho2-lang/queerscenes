CREATE OR REPLACE FUNCTION public.get_top_content_ids(_limit integer DEFAULT 10)
RETURNS TABLE(content_id uuid, rank bigint, clicks bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH recent_clicks AS (
    SELECT cc.content_id, cc.clicked_at, cc.id
    FROM public.content_clicks cc
    ORDER BY cc.clicked_at DESC, cc.id DESC
    LIMIT 1000
  ),
  ranked AS (
    SELECT
      rc.content_id,
      COUNT(*)::bigint AS clicks,
      ROW_NUMBER() OVER (
        ORDER BY COUNT(*) DESC, MAX(rc.clicked_at) DESC, rc.content_id
      ) AS rank
    FROM recent_clicks rc
    GROUP BY rc.content_id
  )
  SELECT ranked.content_id, ranked.rank, ranked.clicks
  FROM ranked
  WHERE ranked.rank <= GREATEST(COALESCE(_limit, 10), 1)
  ORDER BY ranked.rank;
$function$;