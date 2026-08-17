CREATE OR REPLACE FUNCTION public.get_active_supporter_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM (
    SELECT DISTINCT lower(email) AS e
    FROM public.pending_supporters
    WHERE status IN ('paid','claimed')
      AND premium_expires_at > now()
    UNION
    SELECT DISTINCT lower(email) AS e
    FROM public.profiles
    WHERE is_premium = true
      AND email IS NOT NULL
      AND (premium_expires_at IS NULL OR premium_expires_at > now())
  ) s;
$$;