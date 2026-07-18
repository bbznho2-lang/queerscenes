-- Copy preview_video_url from the "filmes" duplicate to the "exclusivos" duplicate
-- so Top 10 / Recent Updates entries (which may point to the exclusivos row) also show the preview.
UPDATE public.contents c
SET preview_video_url = src.preview_video_url,
    updated_at = now()
FROM public.contents src
WHERE lower(c.title) IN ('leviticus', 'girls like girls')
  AND lower(src.title) = lower(c.title)
  AND c.id <> src.id
  AND (c.preview_video_url IS NULL OR length(trim(c.preview_video_url)) = 0)
  AND src.preview_video_url IS NOT NULL
  AND length(trim(src.preview_video_url)) > 0;