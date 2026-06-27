ALTER TABLE public.supporter_events REPLICA IDENTITY FULL;
ALTER TABLE public.pending_supporters REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supporter_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_supporters;