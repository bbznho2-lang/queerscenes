-- 1) Claim function: also honor manual (pending) grants
CREATE OR REPLACE FUNCTION public.claim_supporter_for_current_user()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_pending RECORD;
  v_admin_id uuid := '97109920-d00e-4242-8374-6d774914bd26';
  v_welcome text := E'Welcome to Queer Scenes 💜\n\nHii!! Some titles are available to watch directly on Telegram — we store them there because it''s safer and provides a better viewing experience.\n\nAs a supporter, you also have access to our VIP group, where you''ll receive news, updates, exclusive content, and new releases before anyone else.\n\nJoin the VIP group here: https://t.me/+36rmaWJhLU1kMjlh';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_email');
  END IF;

  SELECT * INTO v_pending
  FROM public.pending_supporters
  WHERE lower(email) = lower(v_email)
    AND status IN ('paid', 'claimed', 'pending')
    AND premium_expires_at > now()
  ORDER BY premium_expires_at DESC
  LIMIT 1;

  IF v_pending.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_pending');
  END IF;

  UPDATE public.profiles
  SET is_premium = true,
      premium_plan = v_pending.plan,
      premium_expires_at = v_pending.premium_expires_at,
      updated_at = now()
  WHERE user_id = v_user_id
    AND (
      is_premium IS DISTINCT FROM true
      OR premium_plan IS DISTINCT FROM v_pending.plan
      OR premium_expires_at IS DISTINCT FROM v_pending.premium_expires_at
    );

  UPDATE public.pending_supporters
  SET status = 'claimed',
      claimed_at = COALESCE(claimed_at, now()),
      updated_at = now()
  WHERE id = v_pending.id
    AND status <> 'claimed';

  IF NOT EXISTS (
    SELECT 1 FROM public.direct_messages
    WHERE recipient_id = v_user_id
      AND sender_id = v_admin_id
      AND body LIKE 'Welcome to Queer Scenes%'
  ) THEN
    INSERT INTO public.direct_messages (sender_id, recipient_id, body)
    VALUES (v_admin_id, v_user_id, v_welcome);
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'plan', v_pending.plan,
    'premium_expires_at', v_pending.premium_expires_at
  );
END;
$function$;

-- 2) Grant by email: always persist an entitlement row, even if profile exists
CREATE OR REPLACE FUNCTION public.admin_grant_supporter_by_email(_email text, _plan text DEFAULT 'lifetime'::text, _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _clean text;
  _profile public.profiles%ROWTYPE;
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

  SELECT * INTO _profile FROM public.profiles WHERE lower(email) = _clean LIMIT 1;

  -- Always keep an email-scoped entitlement so re-signups restore supporter status
  INSERT INTO public.pending_supporters (email, plan, premium_expires_at, status)
  VALUES (_clean, _plan, _exp, 'pending');

  IF FOUND THEN
    UPDATE public.profiles
       SET is_premium = true,
           premium_plan = _plan,
           premium_expires_at = _expires_at,
           updated_at = now()
     WHERE id = _profile.id;
    RETURN jsonb_build_object('status', 'granted', 'email', _clean);
  END IF;

  RETURN jsonb_build_object('status', 'pending', 'email', _clean);
END;
$function$;

-- 3) Admin toggling premium on a profile also persists/removes the email entitlement
CREATE OR REPLACE FUNCTION public.admin_set_profile_premium(_profile_id uuid, _is_premium boolean, _premium_plan text DEFAULT NULL::text, _premium_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
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
      UPDATE public.pending_supporters
         SET status = 'revoked', updated_at = now()
       WHERE lower(email) = lower(v_email)
         AND status IN ('pending', 'paid', 'claimed');
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