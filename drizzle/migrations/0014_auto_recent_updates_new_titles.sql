CREATE OR REPLACE FUNCTION public.feature_new_catalog_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type NOT IN ('serie', 'filme') OR NEW.is_archived OR lower(trim(NEW.section)) IN ('gl', 'bl') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.featured_episodes f
    JOIN public.contents c ON c.id = f.content_id
    WHERE lower(trim(c.title)) = lower(trim(NEW.title)) AND NOT c.is_archived
  ) THEN RETURN NEW; END IF;
  INSERT INTO public.featured_episodes (content_id, episode_id, position)
  SELECT NEW.id, NULL, COALESCE(MIN(position), 0) - 1 FROM public.featured_episodes;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.feature_new_catalog_title() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER feature_new_catalog_title_after_insert
AFTER INSERT ON public.contents
FOR EACH ROW EXECUTE FUNCTION public.feature_new_catalog_title();