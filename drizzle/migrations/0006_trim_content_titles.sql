UPDATE public.contents SET title = btrim(title) WHERE title <> btrim(title);
UPDATE public.episodes SET title = btrim(title) WHERE title <> btrim(title);
CREATE OR REPLACE FUNCTION public.trim_title_whitespace() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.title := btrim(NEW.title); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trim_contents_title ON public.contents;
CREATE TRIGGER trim_contents_title BEFORE INSERT OR UPDATE OF title ON public.contents FOR EACH ROW EXECUTE FUNCTION public.trim_title_whitespace();
DROP TRIGGER IF EXISTS trim_episodes_title ON public.episodes;
CREATE TRIGGER trim_episodes_title BEFORE INSERT OR UPDATE OF title ON public.episodes FOR EACH ROW EXECUTE FUNCTION public.trim_title_whitespace();