ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.episodes
SET links = jsonb_build_array(
  jsonb_build_object('title', 'Watch on site', 'type', 'embed', 'url', player_url)
)
WHERE (links IS NULL OR jsonb_array_length(links) = 0)
  AND player_url IS NOT NULL
  AND length(trim(player_url)) > 0;