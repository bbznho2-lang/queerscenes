-- Column-level lockdown: premium playback fields must only be reachable via
-- security-definer getters (get_content_player_url, get_episode_player_url,
-- get_content_links, get_episode_links, admin_get_contents_v2, admin_get_episodes).
REVOKE SELECT (player_url, links) ON public.contents FROM anon, authenticated;
REVOKE SELECT (player_url, links) ON public.episodes FROM anon, authenticated;

-- Keep service_role and admin RPCs (SECURITY DEFINER) able to read everything.
GRANT SELECT (player_url, links) ON public.contents TO service_role;
GRANT SELECT (player_url, links) ON public.episodes TO service_role;