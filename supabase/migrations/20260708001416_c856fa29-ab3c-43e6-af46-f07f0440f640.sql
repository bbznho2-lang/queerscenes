-- Lock down premium playback fields at the column level.
-- The app reads these via SECURITY DEFINER RPCs (get_content_player_url,
-- get_content_links, get_episode_player_url, get_episode_links,
-- admin_get_contents_v2, admin_get_episodes) which enforce supporter/admin checks.
REVOKE SELECT (player_url, links) ON public.contents FROM anon, authenticated;
REVOKE SELECT (player_url, links) ON public.episodes FROM anon, authenticated;

-- Keep service_role fully privileged (for edge functions/webhooks).
GRANT SELECT ON public.contents TO service_role;
GRANT SELECT ON public.episodes TO service_role;