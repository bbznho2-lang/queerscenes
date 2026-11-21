CREATE OR REPLACE FUNCTION public.get_supporter_user_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
 SELECT p.user_id FROM public.profiles p
 WHERE p.user_id = auth.uid() AND p.user_id = ANY(_user_ids[1:200])
 AND p.is_premium = true AND p.premium_plan IN ('monthly','quarterly','annual','yearly')
 AND p.premium_expires_at > now();
$$;
REVOKE EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_new_title_request_state()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
 NEW.status := 'pending';
 NEW.admin_reply := NULL;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_new_title_request_state() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_new_title_request_state_before_insert
BEFORE INSERT ON public.title_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_new_title_request_state();

CREATE OR REPLACE FUNCTION public.list_public_title_requests(_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, display_name text, title_name text, genre text, country text, note text, status text, admin_reply text, created_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT r.id, COALESCE(NULLIF(btrim(r.requester_name), ''), 'Anonymous') AS display_name,
 r.title_name, r.genre, r.country, r.note, r.status, r.admin_reply, r.created_at
 FROM public.title_requests r ORDER BY r.created_at DESC
 LIMIT LEAST(GREATEST(COALESCE(_limit,20),1),100);
$$;
REVOKE EXECUTE ON FUNCTION public.list_support_chat_messages(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_support_chat_messages(uuid,text) TO service_role;