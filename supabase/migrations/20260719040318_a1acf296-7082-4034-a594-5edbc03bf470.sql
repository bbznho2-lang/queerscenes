
UPDATE public.contents
SET links = (SELECT links FROM public.contents WHERE id = '9c9b5e7d-73d6-4290-bb36-6f46da2e6a1e'),
    player_url = (SELECT player_url FROM public.contents WHERE id = '9c9b5e7d-73d6-4290-bb36-6f46da2e6a1e')
WHERE id = 'e252222e-0843-43dd-9868-422af87baeb9';

DROP FUNCTION IF EXISTS public.admin_get_contents(uuid[]);

CREATE OR REPLACE FUNCTION public.admin_get_contents(_ids uuid[])
 RETURNS TABLE(id uuid, title text, year integer, tag text, type text, banner_url text, player_url text, links jsonb, is_premium boolean, synopsis text, "position" integer, section text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT c.id, c.title, c.year, c.tag, c.type, c.banner_url, c.player_url, c.links,
           c.is_premium, c.synopsis, c."position", c.section
    FROM public.contents c WHERE c.id = ANY(_ids);
END;
$function$;
