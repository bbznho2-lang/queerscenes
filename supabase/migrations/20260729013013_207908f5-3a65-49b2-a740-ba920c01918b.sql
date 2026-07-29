CREATE OR REPLACE FUNCTION public.get_active_supporter_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.profiles
  WHERE is_premium = true
    AND (premium_expires_at IS NULL OR premium_expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.get_active_supporter_count() TO anon, authenticated, service_role;