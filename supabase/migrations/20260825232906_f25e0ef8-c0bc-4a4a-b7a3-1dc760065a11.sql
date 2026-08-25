CREATE TABLE public.title_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  requester_name text,
  title_name text NOT NULL,
  genre text,
  country text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.title_requests TO authenticated;
GRANT INSERT ON public.title_requests TO anon;
GRANT ALL ON public.title_requests TO service_role;

ALTER TABLE public.title_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a title request"
  ON public.title_requests FOR INSERT
  WITH CHECK (
    length(btrim(email)) > 3
    AND length(btrim(title_name)) > 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Users can view their own requests"
  ON public.title_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all requests"
  ON public.title_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests"
  ON public.title_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete requests"
  ON public.title_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_title_requests_updated_at
  BEFORE UPDATE ON public.title_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.list_public_title_requests(_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, display_name text, title_name text, genre text, country text, note text, status text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    COALESCE(
      NULLIF(btrim(r.requester_name), ''),
      initcap(split_part(r.email, '@', 1))
    ) AS display_name,
    r.title_name,
    r.genre,
    r.country,
    r.note,
    r.status,
    r.created_at
  FROM public.title_requests r
  ORDER BY r.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 20), 1)
$$;

GRANT EXECUTE ON FUNCTION public.list_public_title_requests(integer) TO anon, authenticated;