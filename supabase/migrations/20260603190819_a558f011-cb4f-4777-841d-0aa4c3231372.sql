
-- 1) Allow featured_episodes to also reference a content directly (movies / titles without episodes)
ALTER TABLE public.featured_episodes
  ADD COLUMN IF NOT EXISTS content_id uuid;

ALTER TABLE public.featured_episodes
  ALTER COLUMN episode_id DROP NOT NULL;

-- Either an episode OR a content must be set (not both null, not both set)
ALTER TABLE public.featured_episodes
  DROP CONSTRAINT IF EXISTS featured_episodes_one_target;
ALTER TABLE public.featured_episodes
  ADD CONSTRAINT featured_episodes_one_target
  CHECK ((episode_id IS NOT NULL)::int + (content_id IS NOT NULL)::int = 1);

-- 2) Secure RPC to fetch episode links for the player (supporter-gated, like get_episode_player_url)
CREATE OR REPLACE FUNCTION public.get_episode_links(_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_links jsonb;
  v_legacy text;
  v_ep_premium boolean;
  v_content_premium boolean;
BEGIN
  SELECT e.links, e.player_url, e.is_premium, c.is_premium
    INTO v_links, v_legacy, v_ep_premium, v_content_premium
  FROM public.episodes e
  JOIN public.contents c ON c.id = e.content_id
  WHERE e.id = _episode_id;

  IF v_links IS NULL AND v_legacy IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF (v_ep_premium OR v_content_premium) AND NOT public.current_user_can_play_premium() THEN
    RETURN '[]'::jsonb;
  END IF;

  IF v_links IS NOT NULL AND jsonb_typeof(v_links) = 'array' AND jsonb_array_length(v_links) > 0 THEN
    RETURN v_links;
  END IF;

  IF v_legacy IS NOT NULL AND length(trim(v_legacy)) > 0 THEN
    RETURN jsonb_build_array(
      jsonb_build_object('title', 'Watch on site', 'type', 'embed', 'url', v_legacy)
    );
  END IF;

  RETURN '[]'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_episode_links(uuid) TO anon, authenticated;
