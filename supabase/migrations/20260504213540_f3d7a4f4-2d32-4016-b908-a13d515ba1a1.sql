CREATE OR REPLACE FUNCTION public.get_supporter_user_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND p.is_premium = true
    AND (p.premium_expires_at IS NULL OR p.premium_expires_at > now());
$$;
REVOKE ALL ON FUNCTION public.get_supporter_user_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) TO anon, authenticated;