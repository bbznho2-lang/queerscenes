
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid,
  body text NOT NULL DEFAULT '',
  media_url text,
  media_type text,
  media_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_direct_messages_created ON public.direct_messages(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all direct messages"
  ON public.direct_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Recipients can view their messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR recipient_id IS NULL);

-- Reads table
CREATE TABLE public.direct_message_reads (
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.direct_message_reads TO authenticated;
GRANT ALL ON public.direct_message_reads TO service_role;

ALTER TABLE public.direct_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
  ON public.direct_message_reads FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Unread counter for current user
CREATE OR REPLACE FUNCTION public.count_unread_direct_messages()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.direct_messages dm
  WHERE (dm.recipient_id = auth.uid() OR dm.recipient_id IS NULL)
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.direct_message_reads r
      WHERE r.message_id = dm.id AND r.user_id = auth.uid()
    );
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
