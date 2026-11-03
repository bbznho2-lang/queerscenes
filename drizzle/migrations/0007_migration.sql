CREATE TABLE public.partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  kind text NOT NULL,
  link text,
  message text NOT NULL,
  honeypot text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partnership_requests_kind_check CHECK (kind IN ('creator', 'brand', 'press', 'distributor', 'other')),
  CONSTRAINT partnership_requests_status_check CHECK (status IN ('new', 'replied', 'archived')),
  CONSTRAINT partnership_requests_email_check CHECK (position('@' IN email) > 1 AND length(email) <= 320),
  CONSTRAINT partnership_requests_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT partnership_requests_message_check CHECK (length(btrim(message)) BETWEEN 1 AND 2000),
  CONSTRAINT partnership_requests_link_check CHECK (link IS NULL OR length(link) <= 500),
  CONSTRAINT partnership_requests_no_honeypot CHECK (honeypot = '')
);

GRANT INSERT ON public.partnership_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnership_requests TO authenticated;
GRANT ALL ON public.partnership_requests TO service_role;

ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send a partnership request" ON public.partnership_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (honeypot = '' AND status = 'new');

CREATE POLICY "Admins read partnership requests" ON public.partnership_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update partnership requests" ON public.partnership_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete partnership requests" ON public.partnership_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));