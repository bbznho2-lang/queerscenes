CREATE TABLE public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id uuid NOT NULL,
  email text,
  first_name text,
  last_name text,
  was_premium boolean NOT NULL DEFAULT false,
  premium_plan text,
  premium_expires_at timestamptz,
  deleted_by text NOT NULL DEFAULT 'self', -- 'self' or 'admin'
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_deletions TO authenticated;
GRANT ALL ON public.account_deletions TO service_role;

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deletions"
  ON public.account_deletions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX account_deletions_created_at_idx ON public.account_deletions (created_at DESC);