CREATE TABLE public.subtitle_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id uuid NOT NULL REFERENCES public.contents(id),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  email text NOT NULL,
  language text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subtitle_requests TO authenticated;
GRANT ALL ON public.subtitle_requests TO service_role;
ALTER TABLE public.subtitle_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subtitle requests" ON public.subtitle_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Active supporters request subtitles" ON public.subtitle_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT done AND public.current_user_can_play_premium() AND EXISTS (SELECT 1 FROM public.contents c WHERE c.id = title_id AND NOT c.is_archived));
CREATE POLICY "Admins read subtitle requests" ON public.subtitle_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update subtitle requests" ON public.subtitle_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX subtitle_requests_email_title_language_uidx ON public.subtitle_requests (lower(btrim(email)), title_id, lower(btrim(language)));
CREATE INDEX subtitle_requests_user_idx ON public.subtitle_requests (user_id, created_at DESC);
ALTER TABLE public.direct_messages ADD COLUMN notification_title text;
ALTER TABLE public.direct_messages ADD COLUMN notification_link text;
CREATE FUNCTION public.validate_subtitle_request() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.id, NEW.title_id, NEW.user_id, NEW.email, NEW.language, NEW.created_at) IS DISTINCT FROM ROW(OLD.id, OLD.title_id, OLD.user_id, OLD.email, OLD.language, OLD.created_at) OR (OLD.done AND NOT NEW.done) THEN
      RAISE EXCEPTION 'Only completion of a subtitle request can be changed';
    END IF;
    RETURN NEW;
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
CREATE TRIGGER validate_subtitle_request BEFORE INSERT OR UPDATE ON public.subtitle_requests FOR EACH ROW EXECUTE FUNCTION public.validate_subtitle_request();
CREATE FUNCTION public.notify_subtitle_request_done() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_slug text; v_sender uuid;
BEGIN
  IF NEW.done AND NOT OLD.done THEN
    SELECT title INTO v_title FROM public.contents WHERE id = NEW.title_id;
    v_slug := normalize(v_title, NFD);
    v_slug := regexp_replace(v_slug, U&'[\0300-\036f]', '', 'g');
    v_slug := lower(btrim(v_slug));
    v_slug := regexp_replace(v_slug, '[^a-z0-9\s-]', '', 'g');
    v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
    v_slug := btrim(regexp_replace(v_slug, '-+', '-', 'g'), '-');
    v_sender := public.system_notification_sender();
    IF v_sender IS NULL THEN RAISE EXCEPTION 'No notification sender available'; END IF;
    INSERT INTO public.direct_messages (sender_id, recipient_id, body, notification_title, notification_link)
    VALUES (v_sender, NEW.user_id, 'We subtitled ' || v_title || ' in ' || NEW.language || '. Watch it now.', 'Your subtitles are ready', '/title/' || v_slug);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_subtitle_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_subtitle_request_done() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_subtitle_request_done AFTER UPDATE OF done ON public.subtitle_requests FOR EACH ROW EXECUTE FUNCTION public.notify_subtitle_request_done();