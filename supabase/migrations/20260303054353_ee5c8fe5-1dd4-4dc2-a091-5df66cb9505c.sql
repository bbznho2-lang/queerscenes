
-- Create watchlist table for "Minha Lista"
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable RLS
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own watchlist
CREATE POLICY "Users can view own watchlist"
ON public.watchlist FOR SELECT
USING (auth.uid() = user_id);

-- Users can add to their own watchlist
CREATE POLICY "Users can add to own watchlist"
ON public.watchlist FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own watchlist
CREATE POLICY "Users can remove from own watchlist"
ON public.watchlist FOR DELETE
USING (auth.uid() = user_id);
