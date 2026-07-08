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
    AND status = 'paid'
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
  WHERE user_id = v_user_id;

  UPDATE public.pending_supporters
  SET status = 'claimed',
      claimed_at = now(),
      updated_at = now()
  WHERE id = v_pending.id;

  -- Send welcome DM (once)
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