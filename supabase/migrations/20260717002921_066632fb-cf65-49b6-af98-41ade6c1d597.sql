
CREATE TABLE public.canceled_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  plan text,
  previous_expires_at timestamptz,
  canceled_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.canceled_subscriptions TO authenticated;
GRANT ALL ON public.canceled_subscriptions TO service_role;

ALTER TABLE public.canceled_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage canceled subs"
ON public.canceled_subscriptions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX canceled_subscriptions_canceled_at_idx ON public.canceled_subscriptions (canceled_at DESC);
CREATE INDEX canceled_subscriptions_email_idx ON public.canceled_subscriptions (lower(email));

CREATE TRIGGER update_canceled_subscriptions_updated_at
BEFORE UPDATE ON public.canceled_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
