CREATE TABLE public.supporter_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  content_id UUID,
  event_type TEXT NOT NULL,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supporter_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert supporter events"
ON public.supporter_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view supporter events"
ON public.supporter_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_supporter_events_created_at ON public.supporter_events(created_at DESC);
CREATE INDEX idx_supporter_events_event_type ON public.supporter_events(event_type);