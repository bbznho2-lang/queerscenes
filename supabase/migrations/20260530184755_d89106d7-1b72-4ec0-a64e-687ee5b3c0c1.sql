
REVOKE SELECT (player_url) ON public.contents FROM anon, authenticated;
REVOKE SELECT (player_url) ON public.episodes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_user_can_play_premium()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_premium = true
        AND (p.premium_expires_at IS NULL OR p.premium_expires_at > now())
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.current_user_can_play_premium() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_content_player_url(_content_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_url text; v_premium boolean;
BEGIN
  SELECT player_url, is_premium INTO v_url, v_premium FROM public.contents WHERE id = _content_id;
  IF v_url IS NULL THEN RETURN NULL; END IF;
  IF NOT v_premium THEN RETURN v_url; END IF;
  IF public.current_user_can_play_premium() THEN RETURN v_url; END IF;
  RETURN NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_content_player_url(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_episode_player_url(_episode_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_url text; v_ep_premium boolean; v_content_premium boolean;
BEGIN
  SELECT e.player_url, e.is_premium, c.is_premium
    INTO v_url, v_ep_premium, v_content_premium
  FROM public.episodes e JOIN public.contents c ON c.id = e.content_id
  WHERE e.id = _episode_id;
  IF v_url IS NULL THEN RETURN NULL; END IF;
  IF NOT v_ep_premium AND NOT v_content_premium THEN RETURN v_url; END IF;
  IF public.current_user_can_play_premium() THEN RETURN v_url; END IF;
  RETURN NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_episode_player_url(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_episodes(_content_id uuid)
RETURNS TABLE (
  id uuid, content_id uuid, title text, episode_number integer, season integer,
  player_url text, is_premium boolean, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT e.id, e.content_id, e.title, e.episode_number, e.season,
           e.player_url, e.is_premium, e.created_at
    FROM public.episodes e WHERE e.content_id = _content_id ORDER BY e.episode_number;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_get_episodes(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_contents(_ids uuid[])
RETURNS TABLE (
  id uuid, title text, year integer, tag text, type text, banner_url text,
  player_url text, is_premium boolean, synopsis text, "position" integer, section text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT c.id, c.title, c.year, c.tag, c.type, c.banner_url, c.player_url,
           c.is_premium, c.synopsis, c."position", c.section
    FROM public.contents c WHERE c.id = ANY(_ids);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_get_contents(uuid[]) TO authenticated;
