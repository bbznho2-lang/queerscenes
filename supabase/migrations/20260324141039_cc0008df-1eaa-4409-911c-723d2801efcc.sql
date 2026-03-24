
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even non-authenticated users can submit support)
CREATE POLICY "Anyone can insert support messages"
ON public.support_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read support messages
CREATE POLICY "Admins can read support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete support messages
CREATE POLICY "Admins can delete support messages"
ON public.support_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
