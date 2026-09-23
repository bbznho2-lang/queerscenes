CREATE INDEX IF NOT EXISTS idx_content_clicks_clicked_at_content_id
ON public.content_clicks (clicked_at DESC, content_id);