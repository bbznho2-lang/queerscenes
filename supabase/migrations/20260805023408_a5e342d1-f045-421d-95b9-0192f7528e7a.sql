CREATE TABLE public.referral_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('click','payment')),
  visitor_id text,
  user_id uuid,
  email text,
  amount_cents integer,
  currency text DEFAULT 'eur',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_events_code_created ON public.referral_events (ref_code, created_at DESC);

GRANT INSERT ON public.referral_events TO anon, authenticated;
GRANT SELECT ON public.referral_events TO authenticated;
GRANT ALL ON public.referral_events TO service_role;

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log referral clicks"
ON public.referral_events FOR INSERT TO anon, authenticated
WITH CHECK (event_type = 'click' AND amount_cents IS NULL AND length(ref_code) BETWEEN 1 AND 60);

CREATE POLICY "Admins can view referral events"
ON public.referral_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));