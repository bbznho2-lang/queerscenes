
ALTER TABLE public.support_chats
  ADD COLUMN IF NOT EXISTS client_token text;

UPDATE public.support_chats
SET client_token = encode(gen_random_bytes(24), 'base64')
WHERE client_token IS NULL;

ALTER TABLE public.support_chats
  ALTER COLUMN client_token SET NOT NULL,
  ALTER COLUMN client_token SET DEFAULT encode(gen_random_bytes(24), 'base64');

DROP FUNCTION IF EXISTS public.start_support_chat(text, text);
DROP FUNCTION IF EXISTS public.list_support_chat_messages(uuid);
DROP FUNCTION IF EXISTS public.send_support_chat_message(uuid, text);

CREATE FUNCTION public.start_support_chat(_name text, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_token text;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;
  IF _email IS NULL OR length(trim(_email)) = 0 THEN RAISE EXCEPTION 'email required'; END IF;
  v_token := encode(gen_random_bytes(24), 'base64');
  INSERT INTO public.support_chats (user_name, user_email, client_token)
  VALUES (left(trim(_name), 100), left(trim(_email), 255), v_token)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'token', v_token);
END;
$$;

CREATE FUNCTION public.list_support_chat_messages(_chat_id uuid, _token text)
RETURNS TABLE(id uuid, chat_id uuid, sender_role text, message text, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.support_chats s WHERE s.id = _chat_id AND s.client_token = _token
  ) THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  END IF;
  RETURN QUERY
    SELECT m.id, m.chat_id, m.sender_role, m.message, m.created_at
    FROM public.chat_messages m
    WHERE m.chat_id = _chat_id
    ORDER BY m.created_at ASC;
END;
$$;

CREATE FUNCTION public.send_support_chat_message(_chat_id uuid, _token text, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _chat_id IS NULL THEN RAISE EXCEPTION 'chat_id required'; END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN RAISE EXCEPTION 'message required'; END IF;
  IF _token IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.support_chats s WHERE s.id = _chat_id AND s.client_token = _token
  ) THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  END IF;
  INSERT INTO public.chat_messages (chat_id, sender_role, message)
  VALUES (_chat_id, CASE WHEN public.has_role(auth.uid(), 'admin') THEN 'admin' ELSE 'user' END, left(trim(_message), 2000))
  RETURNING id INTO v_id;
  UPDATE public.support_chats SET updated_at = now() WHERE id = _chat_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_support_chat(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_support_chat(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.list_support_chat_messages(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_support_chat_messages(uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.send_support_chat_message(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_support_chat_message(uuid, text, text) TO anon, authenticated;
