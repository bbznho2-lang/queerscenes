
-- 1. PROFILES: prevent self-update of premium fields
CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_premium IS DISTINCT FROM OLD.is_premium
       OR NEW.premium_plan IS DISTINCT FROM OLD.premium_plan
       OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at THEN
      NEW.is_premium := OLD.is_premium;
      NEW.premium_plan := OLD.premium_plan;
      NEW.premium_expires_at := OLD.premium_expires_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_premium_fields ON public.profiles;
CREATE TRIGGER protect_profile_premium_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_premium_fields();

-- 2. SUPPORTER_EVENTS: prevent spoofing user_id
DROP POLICY IF EXISTS "Anyone can insert supporter events" ON public.supporter_events;
CREATE POLICY "Anyone can insert supporter events"
ON public.supporter_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- 3. SUPPORT CHAT lockdown
-- Drop the public read/write policies
DROP POLICY IF EXISTS "Anyone can view chats by email" ON public.support_chats;
DROP POLICY IF EXISTS "Anyone can insert support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;

-- Admins keep read access (no admin SELECT existed before)
CREATE POLICY "Admins can view support chats"
ON public.support_chats
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins need INSERT to reply
CREATE POLICY "Admins can insert chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPCs for anonymous support chat
CREATE OR REPLACE FUNCTION public.start_support_chat(_name text, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'name required';
  END IF;
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RAISE EXCEPTION 'email required';
  END IF;
  INSERT INTO public.support_chats (user_name, user_email)
  VALUES (left(trim(_name), 100), left(trim(_email), 255))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_support_chat_message(_chat_id uuid, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _chat_id IS NULL THEN
    RAISE EXCEPTION 'chat_id required';
  END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.support_chats WHERE id = _chat_id) THEN
    RAISE EXCEPTION 'chat not found';
  END IF;
  INSERT INTO public.chat_messages (chat_id, sender_role, message)
  VALUES (_chat_id, 'user', left(trim(_message), 2000))
  RETURNING id INTO v_id;
  UPDATE public.support_chats SET updated_at = now() WHERE id = _chat_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_support_chat_messages(_chat_id uuid)
RETURNS TABLE (id uuid, chat_id uuid, sender_role text, message text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.id, m.chat_id, m.sender_role, m.message, m.created_at
  FROM public.chat_messages m
  WHERE m.chat_id = _chat_id
  ORDER BY m.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.start_support_chat(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_support_chat_message(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_support_chat_messages(uuid) TO anon, authenticated;

-- 4. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime DROP TABLE public.content_clicks;

-- 5. Drop legacy premium/free player URL columns (no longer used in code)
ALTER TABLE public.contents DROP COLUMN IF EXISTS player_url_free;
ALTER TABLE public.contents DROP COLUMN IF EXISTS player_url_premium;
ALTER TABLE public.episodes DROP COLUMN IF EXISTS player_url_free;
ALTER TABLE public.episodes DROP COLUMN IF EXISTS player_url_premium;

-- 6. Banners bucket: drop public listing policy (files still served by URL)
DROP POLICY IF EXISTS "Anyone can view banners" ON storage.objects;

-- 7. Revoke EXECUTE on internal SECURITY DEFINER functions from client roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_profile_premium_fields() FROM anon, authenticated, public;
