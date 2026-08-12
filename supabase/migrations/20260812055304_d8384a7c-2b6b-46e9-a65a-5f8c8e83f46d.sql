CREATE OR REPLACE FUNCTION public.admin_set_profile_premium(_profile_id uuid, _is_premium boolean, _premium_plan text DEFAULT NULL, _premium_expires_at timestamp with time zone DEFAULT NULL)
RETURNS TABLE(id uuid, user_id uuid, email text, first_name text, last_name text, is_premium boolean, premium_plan text, premium_expires_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id required';
  END IF;

  IF _premium_plan IS NOT NULL AND _premium_plan NOT IN ('monthly', 'quarterly', 'annual', 'lifetime') THEN
    RAISE EXCEPTION 'invalid premium plan';
  END IF;

  IF NOT _is_premium THEN
    _premium_plan := NULL;
    _premium_expires_at := NULL;
  END IF;

  SELECT p.email INTO v_email FROM public.profiles p WHERE p.id = _profile_id;

  IF v_email IS NOT NULL THEN
    IF _is_premium THEN
      INSERT INTO public.pending_supporters (email, plan, premium_expires_at, status)
      VALUES (lower(v_email), COALESCE(_premium_plan, 'lifetime'),
              COALESCE(_premium_expires_at, now() + interval '100 years'), 'pending');
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
$$;