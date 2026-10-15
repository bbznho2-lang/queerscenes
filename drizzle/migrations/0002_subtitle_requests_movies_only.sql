CREATE OR REPLACE FUNCTION public.validate_subtitle_request() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.id, NEW.title_id, NEW.user_id, NEW.email, NEW.language, NEW.created_at) IS DISTINCT FROM ROW(OLD.id, OLD.title_id, OLD.user_id, OLD.email, OLD.language, OLD.created_at) OR (OLD.done AND NOT NEW.done) THEN
      RAISE EXCEPTION 'Only completion of a subtitle request can be changed';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contents c WHERE c.id = NEW.title_id AND c.type = 'filme' AND NOT c.is_archived) THEN
    RAISE EXCEPTION 'Subtitle requests are only available for movies';
  END IF;
  NEW.email := lower(btrim(NEW.email));
  NEW.language := regexp_replace(btrim(NEW.language), '\s+', ' ', 'g');
  IF length(NEW.email) > 254 OR NEW.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF length(NEW.language) < 2 OR length(NEW.language) > 80 THEN
    RAISE EXCEPTION 'Enter a language between 2 and 80 characters';
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END;
$$;