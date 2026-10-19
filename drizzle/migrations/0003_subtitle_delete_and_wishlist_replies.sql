CREATE POLICY "Admins delete subtitle requests" ON public.subtitle_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.title_requests ADD COLUMN admin_reply text;

CREATE OR REPLACE FUNCTION public.notify_title_request_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender uuid;
  v_slug text;
BEGIN
  IF NEW.status = 'added' AND OLD.status IS DISTINCT FROM 'added' AND NEW.user_id IS NOT NULL THEN
    v_sender := public.system_notification_sender();
    IF v_sender IS NULL THEN RETURN NEW; END IF;
    v_slug := normalize(NEW.title_name, NFD);
    v_slug := regexp_replace(v_slug, U&'[\0300-\036f]', '', 'g');
    v_slug := lower(btrim(v_slug));
    v_slug := regexp_replace(v_slug, '[^a-z0-9\s-]', '', 'g');
    v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
    v_slug := btrim(regexp_replace(v_slug, '-+', '-', 'g'), '-');
    INSERT INTO public.direct_messages (sender_id, recipient_id, body, notification_title, notification_link)
    VALUES (v_sender, NEW.user_id,
      'Good news! "' || NEW.title_name || '" is now available on Queer Scenes. Watch it now.',
      'Your wishlist title is here', '/title/' || v_slug);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_title_request_added() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_title_request_added AFTER UPDATE OF status ON public.title_requests FOR EACH ROW EXECUTE FUNCTION public.notify_title_request_added();

CREATE OR REPLACE FUNCTION public.admin_send_direct_message(_user_id uuid, _body text, _notification_title text DEFAULT NULL, _notification_link text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender uuid;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN RAISE EXCEPTION 'message required'; END IF;
  v_sender := public.system_notification_sender();
  IF v_sender IS NULL THEN RAISE EXCEPTION 'no notification sender available'; END IF;
  INSERT INTO public.direct_messages (sender_id, recipient_id, body, notification_title, notification_link)
  VALUES (v_sender, _user_id, left(trim(_body), 2000), left(_notification_title, 120), _notification_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_send_direct_message(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_send_direct_message(uuid, text, text, text) TO authenticated;

DROP FUNCTION public.list_public_title_requests(integer);
CREATE FUNCTION public.list_public_title_requests(_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, display_name text, title_name text, genre text, country text, note text, status text, admin_reply text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    r.id,
    COALESCE(NULLIF(btrim(r.requester_name), ''), initcap(split_part(r.email, '@', 1))) AS display_name,
    r.title_name, r.genre, r.country, r.note, r.status, r.admin_reply, r.created_at
  FROM public.title_requests r
  ORDER BY r.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 20), 1)
$$;