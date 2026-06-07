CREATE TABLE IF NOT EXISTS public.direct_message_hides (
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.direct_message_hides TO authenticated;
GRANT ALL ON public.direct_message_hides TO service_role;

ALTER TABLE public.direct_message_hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hides"
ON public.direct_message_hides
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS direct_message_hides_user_idx ON public.direct_message_hides(user_id);