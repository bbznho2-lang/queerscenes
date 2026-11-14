CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) AND (_user_id = auth.uid() OR coalesce(auth.role(), '') = 'service_role' OR session_user = 'postgres')
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_supporter_user_ids(_user_ids uuid[])
 RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND p.is_premium = true
    AND p.premium_expires_at > now()
    AND EXISTS (SELECT 1 FROM public.content_comments cc WHERE cc.user_id = p.user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) TO authenticated, service_role;