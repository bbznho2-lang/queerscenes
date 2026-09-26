ALTER TABLE public.canceled_subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_event_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS canceled_subscriptions_stripe_event_id_uidx
  ON public.canceled_subscriptions (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS canceled_subscriptions_user_id_idx
  ON public.canceled_subscriptions (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS canceled_subscriptions_stripe_subscription_id_idx
  ON public.canceled_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;