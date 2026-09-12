CREATE OR REPLACE FUNCTION public.admin_grant_supporter_by_email(
  _email text,
  _plan text DEFAULT 'lifetime'::text,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text;
  _profile public.profiles%ROWTYPE;
  _profile_found boolean := false;
  _exp timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _clean := lower(trim(_email));
  IF _clean IS NULL OR _clean = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  _exp := COALESCE(_expires_at, now() + interval '100 years');

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
  VALUES (_clean, _plan, _exp, CASE WHEN _profile_found THEN 'claimed' ELSE 'paid' END,
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
$$;

REVOKE ALL ON FUNCTION public.admin_grant_supporter_by_email(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_supporter_by_email(text, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_supporter_by_email(text, text, timestamptz) TO authenticated;

UPDATE public.pending_supporters
SET status = 'paid', updated_at = now()
WHERE lower(trim(email)) = lower(trim('lizziedorley@yahoo.com'))
  AND status = 'pending'
  AND premium_expires_at > now();