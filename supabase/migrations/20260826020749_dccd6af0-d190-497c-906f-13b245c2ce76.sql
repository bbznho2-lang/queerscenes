
-- Helper: pick a stable "system" sender (an admin) for automated notifications.
CREATE OR REPLACE FUNCTION public.system_notification_sender()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role ORDER BY user_id LIMIT 1
$$;

-- Notify admins + parent comment author when a comment is posted.
CREATE OR REPLACE FUNCTION public.notify_on_content_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid;
  v_title text;
  v_parent_author uuid;
  v_parent_name text;
  v_snippet text;
BEGIN
  v_sender := public.system_notification_sender();
  IF v_sender IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_title FROM public.contents WHERE id = NEW.content_id;
  v_title := COALESCE(v_title, 'a title');
  v_snippet := left(NEW.body, 180);

  -- Reply notification for the original comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id, author_name INTO v_parent_author, v_parent_name
    FROM public.content_comments WHERE id = NEW.parent_id;

    IF v_parent_author IS NOT NULL AND v_parent_author <> NEW.user_id THEN
      INSERT INTO public.direct_messages (sender_id, recipient_id, body)
      VALUES (
        v_sender,
        v_parent_author,
        '💬 ' || NEW.author_name || ' replied to your comment on "' || v_title || '":' || E'\n\n' || v_snippet
      );
    END IF;
  END IF;

  -- Admin notification for every new comment
  INSERT INTO public.direct_messages (sender_id, recipient_id, body)
  SELECT
    v_sender,
    ur.user_id,
    '💬 New comment on "' || v_title || '" by ' || NEW.author_name || ':' || E'\n\n' || v_snippet
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::app_role
    AND ur.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_content_comment ON public.content_comments;
CREATE TRIGGER trg_notify_on_content_comment
AFTER INSERT ON public.content_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_content_comment();

-- Notify admins when a wishlist title request is submitted.
CREATE OR REPLACE FUNCTION public.notify_on_title_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid;
BEGIN
  v_sender := public.system_notification_sender();
  IF v_sender IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.direct_messages (sender_id, recipient_id, body)
  SELECT
    v_sender,
    ur.user_id,
    '⭐ New wishlist request: "' || NEW.title_name || '"' || E'\n' ||
    'From: ' || COALESCE(NULLIF(NEW.requester_name, ''), 'Anonymous') || ' (' || NEW.email || ')' ||
    COALESCE(E'\n' || 'Genre: ' || NULLIF(NEW.genre, ''), '') ||
    COALESCE(E'\n' || 'Country: ' || NULLIF(NEW.country, ''), '') ||
    COALESCE(E'\n' || 'Note: ' || left(NULLIF(NEW.note, ''), 200), '')
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::app_role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_title_request ON public.title_requests;
CREATE TRIGGER trg_notify_on_title_request
AFTER INSERT ON public.title_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_title_request();
