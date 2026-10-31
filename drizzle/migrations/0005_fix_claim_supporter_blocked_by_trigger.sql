-- Allow the claim_supporter_for_current_user function to update premium fields
-- by checking an explicit, transaction-scoped flag it sets before updating.
CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- The claim function opts in explicitly for this transaction.
  IF current_setting('app.premium_update_allowed', true) = 'on' THEN
    RETURN NEW;
  END IF;
  -- Allow service_role (used by Stripe webhook) and admins to change premium fields.
  -- Block only regular authenticated users from self-promoting.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_premium IS DISTINCT FROM OLD.is_premium
       OR NEW.premium_plan IS DISTINCT FROM OLD.premium_plan
       OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at THEN
      NEW.is_premium := OLD.is_premium;
      NEW.premium_plan := OLD.premium_plan;
      NEW.premium_expires_at := OLD.premium_expires_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

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
  v_welcome text := E'Welcome to Queer Scenes \U0001F49C\n\nHii!! join our main community channel so you don''t miss any title or update. We post new releases, announcements and recommendations there.\n\nJoin the community here https://t.me/QueerScenesTv';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_email');
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

-- Repair the supporter who paid (Stripe) before signing up and got silently blocked:
UPDATE public.profiles p
SET is_premium = true,
    premium_plan = ps.plan,
    premium_expires_at = ps.premium_expires_at,
    updated_at = now()
FROM public.pending_supporters ps
WHERE lower(ps.email) = lower(p.email)
  AND ps.status IN ('paid','claimed','pending')
  AND ps.premium_expires_at > now()
  AND NOT (p.is_premium AND p.premium_plan IN ('monthly','quarterly','annual','yearly') AND p.premium_expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.pending_supporters newer
    WHERE lower(newer.email) = lower(p.email)
      AND newer.status = 'revoked'
      AND newer.premium_expires_at > ps.premium_expires_at
  );