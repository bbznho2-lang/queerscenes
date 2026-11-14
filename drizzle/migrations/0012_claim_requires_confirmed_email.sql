CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email,
    left(nullif(btrim(NEW.raw_user_meta_data->>'first_name'), ''), 100),
    left(nullif(btrim(NEW.raw_user_meta_data->>'last_name'), ''), 100));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_supporter_for_current_user()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_pending RECORD;
  v_admin_id uuid := '97109920-d00e-4242-8374-6d774914bd26';
  v_welcome text := E'Welcome to Queer Scenes \U0001F49C\n\nHii!! join our main community channel so you don''t miss any title or update. We post new releases, announcements and recommendations there.\n\nJoin the community here https://t.me/QueerScenesTv';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;
  SELECT email, email_confirmed_at INTO v_email, v_confirmed FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_email');
  END IF;
  IF v_confirmed IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'email_not_confirmed');
  END IF;
  SELECT * INTO v_pending FROM public.pending_supporters
  WHERE lower(email) = lower(v_email) AND status IN ('paid','claimed','pending') AND premium_expires_at > now()
  ORDER BY premium_expires_at DESC LIMIT 1;
  IF v_pending.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_pending');
  END IF;
  PERFORM set_config('app.premium_update_allowed', 'on', true);
  UPDATE public.profiles
  SET is_premium = true, premium_plan = v_pending.plan, premium_expires_at = v_pending.premium_expires_at, updated_at = now()
  WHERE user_id = v_user_id AND (is_premium IS DISTINCT FROM true OR premium_plan IS DISTINCT FROM v_pending.plan OR premium_expires_at IS DISTINCT FROM v_pending.premium_expires_at);
  PERFORM set_config('app.premium_update_allowed', 'off', true);
  UPDATE public.pending_supporters
  SET status = 'claimed', claimed_at = COALESCE(claimed_at, now()), updated_at = now()
  WHERE id = v_pending.id AND status <> 'claimed';
  IF NOT EXISTS (SELECT 1 FROM public.direct_messages WHERE recipient_id = v_user_id AND sender_id = v_admin_id AND body LIKE 'Welcome to Queer Scenes%') THEN
    INSERT INTO public.direct_messages (sender_id, recipient_id, body) VALUES (v_admin_id, v_user_id, v_welcome);
  END IF;
  RETURN jsonb_build_object('claimed', true, 'plan', v_pending.plan, 'premium_expires_at', v_pending.premium_expires_at);
END;
$function$;