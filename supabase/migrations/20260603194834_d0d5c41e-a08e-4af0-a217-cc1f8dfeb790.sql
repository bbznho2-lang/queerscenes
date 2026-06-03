
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.contents
SET links = jsonb_build_array(
  jsonb_build_object('title', 'Watch on site', 'type', 'embed', 'url', player_url)
)
WHERE (links IS NULL OR jsonb_array_length(links) = 0)
  AND player_url IS NOT NULL
  AND length(trim(player_url)) > 0;

CREATE OR REPLACE FUNCTION public.get_content_links(_content_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.admin_get_contents_v2(_ids uuid[])
RETURNS TABLE(id uuid, title text, year integer, tag text, type text, banner_url text, player_url text, links jsonb, is_premium boolean, synopsis text, "position" integer, section text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT c.id, c.title, c.year, c.tag, c.type, c.banner_url, c.player_url, c.links,
           c.is_premium, c.synopsis, c."position", c.section
    FROM public.contents c WHERE c.id = ANY(_ids);
END;
$$;
