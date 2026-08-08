ALTER TABLE public.content_clicks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_clicks;