GRANT SELECT (id, title, year, tag, type, banner_url, section, position, created_at, updated_at, is_premium, synopsis, is_archived, supporter_player_enabled, preview_video_url, cast_members) ON public.contents TO anon, authenticated;
GRANT SELECT (id, content_id, title, episode_number, created_at, season, is_premium) ON public.episodes TO anon, authenticated;
GRANT ALL ON public.contents TO service_role;
GRANT ALL ON public.episodes TO service_role;