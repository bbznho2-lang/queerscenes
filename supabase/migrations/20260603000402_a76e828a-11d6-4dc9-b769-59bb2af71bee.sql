
DROP FUNCTION IF EXISTS public.admin_get_episodes(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_episodes(_content_id uuid)
RETURNS TABLE(id uuid, content_id uuid, title text, episode_number integer, season integer, player_url text, links jsonb, is_premium boolean, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT e.id, e.content_id, e.title, e.episode_number, e.season,
           e.player_url, e.links, e.is_premium, e.created_at
    FROM public.episodes e WHERE e.content_id = _content_id ORDER BY e.episode_number;
END; $$;
