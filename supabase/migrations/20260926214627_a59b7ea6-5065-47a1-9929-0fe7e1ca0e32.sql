CREATE OR REPLACE FUNCTION public.admin_grant_supporter_by_email(
  _email text,
  _plan text DEFAULT 'monthly'::text,
  _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _clean text;
  _profile public.profiles%ROWTYPE;
  _profile_found boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _clean := lower(trim(_email));
  IF _clean IS NULL OR _clean = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF _plan NOT IN ('monthly', 'quarterly', 'annual', 'yearly') THEN
    RAISE EXCEPTION 'Invalid supporter plan';
  END IF;
  IF _expires_at IS NULL OR _expires_at <= now() THEN
    RAISE EXCEPTION 'A future expiration date is required';
  END IF;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE lower(trim(email)) = _clean
  LIMIT 1;
  _profile_found := FOUND;

  UPDATE public.pending_supporters
  SET status = 'replaced', updated_at = now()
  WHERE lower(trim(email)) = _clean
    AND status IN ('pending', 'paid', 'claimed')
    AND premium_expires_at > now();

  INSERT INTO public.pending_supporters (email, plan, premium_expires_at, status, claimed_at)
  VALUES (_clean, _plan, _expires_at, CASE WHEN _profile_found THEN 'claimed' ELSE 'paid' END,
          CASE WHEN _profile_found THEN now() ELSE NULL END);

  IF _profile_found THEN
    UPDATE public.profiles
    SET is_premium = true,
        premium_plan = _plan,
        premium_expires_at = _expires_at,
        updated_at = now()
    WHERE id = _profile.id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'active',
    'profile_linked', _profile_found,
    'email', _clean
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_profile_premium(
  _profile_id uuid,
  _is_premium boolean,
  _premium_plan text DEFAULT NULL::text,
  _premium_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(id uuid, user_id uuid, email text, first_name text, last_name text, is_premium boolean, premium_plan text, premium_expires_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id required';
  END IF;

  IF _is_premium THEN
    IF _premium_plan IS NULL OR _premium_plan NOT IN ('monthly', 'quarterly', 'annual', 'yearly') THEN
      RAISE EXCEPTION 'invalid premium plan';
    END IF;
    IF _premium_expires_at IS NULL OR _premium_expires_at <= now() THEN
      RAISE EXCEPTION 'a future expiration date is required';
    END IF;
  ELSE
    _premium_plan := NULL;
    _premium_expires_at := NULL;
  END IF;

  SELECT p.email INTO v_email FROM public.profiles p WHERE p.id = _profile_id;

  IF v_email IS NOT NULL THEN
    IF _is_premium THEN
      INSERT INTO public.pending_supporters (email, plan, premium_expires_at, status)
      VALUES (lower(v_email), _premium_plan, _premium_expires_at, 'pending');
    ELSE
      UPDATE public.pending_supporters ps
         SET status = 'revoked', updated_at = now()
       WHERE lower(ps.email) = lower(v_email)
         AND ps.status IN ('pending', 'paid', 'claimed');
    END IF;
  END IF;

  RETURN QUERY
  UPDATE public.profiles p
     SET is_premium = _is_premium,
         premium_plan = CASE WHEN _is_premium THEN _premium_plan ELSE NULL END,
         premium_expires_at = CASE WHEN _is_premium THEN _premium_expires_at ELSE NULL END,
         updated_at = now()
   WHERE p.id = _profile_id
   RETURNING p.id, p.user_id, p.email, p.first_name, p.last_name, p.is_premium,
             p.premium_plan, p.premium_expires_at, p.created_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
END;
$function$;

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
      AND p.premium_plan IN ('monthly', 'quarterly', 'annual', 'yearly')
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
      AND plan IN ('monthly', 'quarterly', 'annual', 'yearly')
      AND premium_expires_at > now()
    UNION
    SELECT DISTINCT lower(email) AS e
    FROM public.profiles
    WHERE is_premium = true
      AND email IS NOT NULL
      AND premium_plan IN ('monthly', 'quarterly', 'annual', 'yearly')
      AND premium_expires_at > now()
  ) s;
$function$;