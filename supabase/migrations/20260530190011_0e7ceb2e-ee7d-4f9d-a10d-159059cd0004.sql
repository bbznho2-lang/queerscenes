
CREATE TABLE IF NOT EXISTS public.pending_supporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  plan text NOT NULL,
  premium_expires_at timestamptz NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'paid',
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_supporters_email ON public.pending_supporters (lower(email));

GRANT ALL ON public.pending_supporters TO service_role;
-- Não concedemos para anon/authenticated: a leitura/escrita só é feita pelo webhook (service_role)
-- e pela função SECURITY DEFINER abaixo.

ALTER TABLE public.pending_supporters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pending supporters"
  ON public.pending_supporters FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending supporters"
  ON public.pending_supporters FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, DELETE ON public.pending_supporters TO authenticated;

-- Função para o usuário reclamar um pagamento feito antes de criar a conta.
-- SECURITY DEFINER passa por cima da trigger protect_profile_premium_fields.
CREATE OR REPLACE FUNCTION public.claim_supporter_for_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_pending RECORD;
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

  RETURN jsonb_build_object(
    'claimed', true,
    'plan', v_pending.plan,
    'premium_expires_at', v_pending.premium_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_supporter_for_current_user() TO authenticated;
