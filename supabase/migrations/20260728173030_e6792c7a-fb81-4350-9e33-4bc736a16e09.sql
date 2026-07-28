REVOKE SELECT (player_url, links) ON public.contents FROM anon, authenticated;
REVOKE SELECT (player_url, links) ON public.episodes FROM anon, authenticated;

-- Re-grant SELECT on all other columns explicitly to preserve current reads
GRANT SELECT (id, title, year, tag, type, banner_url, section, position, created_at, updated_at, is_premium, synopsis, is_archived, supporter_player_enabled, preview_video_url) ON public.contents TO anon, authenticated;
GRANT SELECT (id, content_id, title, episode_number, season, created_at, is_premium) ON public.episodes TO anon, authenticated;