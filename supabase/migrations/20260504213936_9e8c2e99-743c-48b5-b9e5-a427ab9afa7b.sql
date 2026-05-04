ALTER TABLE public.content_clicks ADD COLUMN IF NOT EXISTS episode_id uuid;
CREATE INDEX IF NOT EXISTS idx_content_clicks_episode_id ON public.content_clicks(episode_id);