CREATE OR REPLACE FUNCTION public.submit_partnership_request(p_name text, p_email text, p_kind text, p_link text, p_message text, p_honeypot text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_honeypot IS DISTINCT FROM '' THEN
    RAISE EXCEPTION 'invalid submission';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_email) > 320 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('creator','brand','press','distributor','other') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;
  IF p_message IS NULL OR btrim(p_message) = '' OR length(p_message) > 2000 THEN
    RAISE EXCEPTION 'invalid message';
  END IF;
  IF p_link IS NOT NULL AND length(p_link) > 500 THEN
    RAISE EXCEPTION 'invalid link';
  END IF;

  INSERT INTO public.partnership_requests (name, email, kind, link, message, honeypot)
  VALUES (btrim(p_name), lower(btrim(p_email)), p_kind, NULLIF(btrim(coalesce(p_link,'')),''), btrim(p_message), '')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partnership_request(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_partnership_request(text, text, text, text, text, text) TO anon, authenticated, service_role;