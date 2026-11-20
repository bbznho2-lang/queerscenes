CREATE OR REPLACE FUNCTION public.get_content_player_url(_content_id uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_url text; v_premium boolean; v_archived boolean;
BEGIN
  SELECT player_url, is_premium, is_archived INTO v_url, v_premium, v_archived FROM public.contents WHERE id = _content_id;
  IF v_url IS NULL THEN RETURN NULL; END IF;
  IF v_archived AND NOT public.has_role(auth.uid(), 'admin') THEN RETURN NULL; END IF;
  IF NOT v_premium THEN RETURN v_url; END IF;
  IF public.current_user_can_play_premium() THEN RETURN v_url; END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_content_links(_content_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_links jsonb; v_legacy text; v_premium boolean; v_archived boolean;
BEGIN
  SELECT links, player_url, is_premium, is_archived INTO v_links, v_legacy, v_premium, v_archived
  FROM public.contents WHERE id = _content_id;
  IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;
  IF v_archived AND NOT public.has_role(auth.uid(), 'admin') THEN RETURN '[]'::jsonb; END IF;
  IF v_premium AND NOT public.current_user_can_play_premium() THEN RETURN '[]'::jsonb; END IF;
  IF v_links IS NOT NULL AND jsonb_typeof(v_links) = 'array' AND jsonb_array_length(v_links) > 0 THEN RETURN v_links; END IF;
  IF v_legacy IS NOT NULL AND length(trim(v_legacy)) > 0 THEN
    RETURN jsonb_build_array(jsonb_build_object('title', 'Watch on site', 'type', 'embed', 'url', v_legacy));
  END IF;
  RETURN '[]'::jsonb;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_episode_links(_episode_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_links jsonb; v_legacy text; v_ep_premium boolean; v_content_premium boolean; v_archived boolean;
BEGIN
  SELECT e.links, e.player_url, e.is_premium, c.is_premium, c.is_archived
    INTO v_links, v_legacy, v_ep_premium, v_content_premium, v_archived
  FROM public.episodes e JOIN public.contents c ON c.id = e.content_id WHERE e.id = _episode_id;
  IF NOT FOUND OR (v_links IS NULL AND v_legacy IS NULL) THEN RETURN '[]'::jsonb; END IF;
  IF v_archived AND NOT public.has_role(auth.uid(), 'admin') THEN RETURN '[]'::jsonb; END IF;
  IF (v_ep_premium OR v_content_premium) AND NOT public.current_user_can_play_premium() THEN RETURN '[]'::jsonb; END IF;
  IF v_links IS NOT NULL AND jsonb_typeof(v_links) = 'array' AND jsonb_array_length(v_links) > 0 THEN RETURN v_links; END IF;
  IF v_legacy IS NOT NULL AND length(trim(v_legacy)) > 0 THEN
    RETURN jsonb_build_array(jsonb_build_object('title', 'Watch on site', 'type', 'embed', 'url', v_legacy));
  END IF;
  RETURN '[]'::jsonb;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_episode_player_url(_episode_id uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_url text; v_ep_premium boolean; v_content_premium boolean; v_archived boolean;
BEGIN
  SELECT e.player_url, e.is_premium, c.is_premium, c.is_archived
    INTO v_url, v_ep_premium, v_content_premium, v_archived
  FROM public.episodes e JOIN public.contents c ON c.id = e.content_id WHERE e.id = _episode_id;
  IF v_url IS NULL THEN RETURN NULL; END IF;
  IF v_archived AND NOT public.has_role(auth.uid(), 'admin') THEN RETURN NULL; END IF;
  IF NOT v_ep_premium AND NOT v_content_premium THEN RETURN v_url; END IF;
  IF public.current_user_can_play_premium() THEN RETURN v_url; END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_comment_like_counts(_comment_ids uuid[])
 RETURNS TABLE(comment_id uuid, likes bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT cl.comment_id, count(*)::bigint
  FROM public.comment_likes cl
  JOIN public.content_comments cc ON cc.id = cl.comment_id
  JOIN public.contents c ON c.id = cc.content_id AND c.is_archived = false
  WHERE cl.comment_id = ANY(_comment_ids[1:200])
  GROUP BY cl.comment_id
$function$;

CREATE OR REPLACE FUNCTION public.get_supporter_user_ids(_user_ids uuid[])
 RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.user_id
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id = ANY(_user_ids[1:200])
    AND p.is_premium = true
    AND p.premium_plan IN ('monthly','quarterly','annual','yearly')
    AND p.premium_expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.content_comments cc
      JOIN public.contents c ON c.id = cc.content_id AND c.is_archived = false
      WHERE cc.user_id = p.user_id);
$function$;