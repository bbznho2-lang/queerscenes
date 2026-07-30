CREATE OR REPLACE FUNCTION public.admin_grant_supporter_by_email(
  _email text,
  _plan text DEFAULT 'lifetime',
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
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _clean := lower(trim(_email));
  IF _clean IS NULL OR _clean = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE lower(email) = _clean LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
       SET is_premium = true,
           premium_plan = _plan,
           premium_expires_at = _expires_at,
           updated_at = now()
     WHERE id = _profile.id;
    RETURN jsonb_build_object('status', 'granted', 'email', _clean);
  END IF;

  INSERT INTO public.pending_supporters (email, plan, premium_expires_at, status)
  VALUES (_clean, _plan, COALESCE(_expires_at, now() + interval '100 years'), 'pending')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('status', 'pending', 'email', _clean);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_supporter_by_email(text, text, timestamptz) TO authenticated;