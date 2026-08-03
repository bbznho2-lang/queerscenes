CREATE TABLE public.watch_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  season integer,
  episode_number integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT watch_progress_user_content_unique UNIQUE (user_id, content_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_progress TO service_role;

ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch progress"
  ON public.watch_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch progress"
  ON public.watch_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch progress"
  ON public.watch_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch progress"
  ON public.watch_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX watch_progress_user_updated_idx ON public.watch_progress (user_id, updated_at DESC);

CREATE TRIGGER update_watch_progress_updated_at
  BEFORE UPDATE ON public.watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();