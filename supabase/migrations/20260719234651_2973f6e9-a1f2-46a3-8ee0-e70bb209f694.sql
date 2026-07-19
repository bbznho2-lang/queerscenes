
-- Content-level mirror
CREATE OR REPLACE FUNCTION public.mirror_content_links()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.mirroring_links', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.player_url IS DISTINCT FROM OLD.player_url
     OR NEW.links IS DISTINCT FROM OLD.links THEN
    PERFORM set_config('app.mirroring_links', '1', true);
    UPDATE public.contents
       SET player_url = NEW.player_url,
           links = NEW.links,
           updated_at = now()
     WHERE title = NEW.title
       AND id <> NEW.id
       AND is_archived = false;
    PERFORM set_config('app.mirroring_links', '0', true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_content_links ON public.contents;
CREATE TRIGGER trg_mirror_content_links
AFTER UPDATE ON public.contents
FOR EACH ROW EXECUTE FUNCTION public.mirror_content_links();

-- Episode-level mirror
CREATE OR REPLACE FUNCTION public.mirror_episode_links()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text;
BEGIN
  IF current_setting('app.mirroring_links', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.player_url IS DISTINCT FROM OLD.player_url
     OR NEW.links IS DISTINCT FROM OLD.links THEN
    SELECT title INTO v_title FROM public.contents WHERE id = NEW.content_id;
    IF v_title IS NULL THEN RETURN NEW; END IF;
    PERFORM set_config('app.mirroring_links', '1', true);
    UPDATE public.episodes e
       SET player_url = NEW.player_url,
           links = NEW.links
      FROM public.contents c
     WHERE e.content_id = c.id
       AND c.title = v_title
       AND c.is_archived = false
       AND e.content_id <> NEW.content_id
       AND e.season = NEW.season
       AND e.episode_number = NEW.episode_number;
    PERFORM set_config('app.mirroring_links', '0', true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_episode_links ON public.episodes;
CREATE TRIGGER trg_mirror_episode_links
AFTER UPDATE ON public.episodes
FOR EACH ROW EXECUTE FUNCTION public.mirror_episode_links();
