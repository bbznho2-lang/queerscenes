CREATE OR REPLACE FUNCTION public.current_user_can_play_premium()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role = 'admin'::public.app_role
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = v_user_id
      AND p.is_premium = true
      AND p.premium_plan IN ('monthly', 'quarterly', 'annual')
      AND p.premium_expires_at > now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_supporter_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::int FROM (
    SELECT DISTINCT lower(email) AS e
    FROM public.pending_supporters
    WHERE status IN ('paid','claimed')
      AND plan IN ('monthly', 'quarterly', 'annual')
      AND premium_expires_at > now()
    UNION
    SELECT DISTINCT lower(email) AS e
    FROM public.profiles
    WHERE is_premium = true
      AND email IS NOT NULL
      AND premium_plan IN ('monthly', 'quarterly', 'annual')
      AND premium_expires_at > now()
  ) s;
$function$;