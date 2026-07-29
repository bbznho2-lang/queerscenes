CREATE OR REPLACE FUNCTION public.mirror_content_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.mirroring_links', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.player_url IS DISTINCT FROM OLD.player_url
     OR NEW.links IS DISTINCT FROM OLD.links
     OR NEW.preview_video_url IS DISTINCT FROM OLD.preview_video_url THEN
    PERFORM set_config('app.mirroring_links', '1', true);
    UPDATE public.contents
       SET player_url = NEW.player_url,
           links = NEW.links,
           preview_video_url = NEW.preview_video_url,
           updated_at = now()
     WHERE title = NEW.title
       AND id <> NEW.id
       AND is_archived = false;
    PERFORM set_config('app.mirroring_links', '0', true);
  END IF;
  RETURN NEW;
END;
$function$;