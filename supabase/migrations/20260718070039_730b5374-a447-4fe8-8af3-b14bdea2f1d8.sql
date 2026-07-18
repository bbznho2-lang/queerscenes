GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.current_user_can_play_premium()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_premium = true
        AND (p.premium_expires_at IS NULL OR p.premium_expires_at > now())
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_content_links(_content_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_links jsonb;
  v_legacy text;
  v_premium boolean;
BEGIN
  SELECT links, player_url, is_premium INTO v_links, v_legacy, v_premium
  FROM public.contents WHERE id = _content_id;

  IF v_premium AND NOT public.current_user_can_play_premium() THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.get_episode_links(_episode_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_content_player_url(_content_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_url text; v_premium boolean;
BEGIN
  SELECT player_url, is_premium INTO v_url, v_premium FROM public.contents WHERE id = _content_id;
  IF v_url IS NULL THEN RETURN NULL; END IF;
  IF NOT v_premium THEN RETURN v_url; END IF;
  IF public.current_user_can_play_premium() THEN RETURN v_url; END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_episode_player_url(_episode_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
END;
$function$;