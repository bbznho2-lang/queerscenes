CREATE OR REPLACE FUNCTION public.get_active_supporter_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT lower(email))::int FROM public.pending_supporters
  WHERE status IN ('paid', 'claimed')
    AND premium_expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_active_supporter_count() TO anon, authenticated, service_role;