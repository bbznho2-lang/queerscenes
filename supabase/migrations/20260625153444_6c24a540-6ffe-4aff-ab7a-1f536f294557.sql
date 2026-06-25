-- Revoke column-level SELECT on sensitive playback columns from public roles.
-- RLS policies allow row access, but column GRANTs gate which columns are exposed.

REVOKE SELECT (player_url, links) ON public.contents FROM anon, authenticated, PUBLIC;
REVOKE SELECT (player_url, links) ON public.episodes FROM anon, authenticated, PUBLIC;

-- Re-grant SELECT on all other columns so the Data API keeps working for catalog browsing.
GRANT SELECT (id, title, year, tag, type, banner_url, section, "position",
              created_at, updated_at, is_premium, synopsis, is_archived,
              supporter_player_enabled, preview_video_url)
  ON public.contents TO anon, authenticated;

GRANT SELECT (id, content_id, title, episode_number, season,
              is_premium, created_at)
  ON public.episodes TO anon, authenticated;

-- service_role keeps full access (needed by edge functions and admin RPCs).
GRANT ALL ON public.contents TO service_role;
GRANT ALL ON public.episodes TO service_role;