
-- 1) Harden supporter_events: remove anon direct insert; provide validated RPC
DROP POLICY IF EXISTS "Anyone can insert supporter events" ON public.supporter_events;

CREATE POLICY "Authenticated can insert own supporter events"
ON public.supporter_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

REVOKE INSERT ON public.supporter_events FROM anon;

CREATE OR REPLACE FUNCTION public.log_supporter_event(
  _event_type text,
  _source text,
  _content_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'paywall_view','locked_content_view','become_supporter_click',
    'supporter_player_click','paywall_signup_click','paywall_signup_submit',
    'checkout_session_created','checkout_completed','watch_free_fallback_click'
  ];
  v_meta jsonb;
BEGIN
  IF _event_type IS NULL OR NOT (_event_type = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'invalid event_type';
  END IF;
  IF _source IS NULL OR length(_source) = 0 OR length(_source) > 100 THEN
    RAISE EXCEPTION 'invalid source';
  END IF;
  v_meta := COALESCE(_metadata, '{}'::jsonb);
  IF pg_column_size(v_meta) > 4096 THEN
    RAISE EXCEPTION 'metadata too large';
  END IF;
  INSERT INTO public.supporter_events (user_id, content_id, event_type, source, metadata)
  VALUES (auth.uid(), _content_id, _event_type, _source, v_meta);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_supporter_event(text, text, uuid, jsonb) TO anon, authenticated;

-- 2) Add explicit public SELECT policy for banners bucket so access is intentional
DROP POLICY IF EXISTS "Public read banners bucket" ON storage.objects;
CREATE POLICY "Public read banners bucket"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'banners');
