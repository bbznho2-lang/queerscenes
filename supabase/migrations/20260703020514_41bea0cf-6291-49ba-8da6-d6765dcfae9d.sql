
-- 1) contents/episodes: hide premium player_url and links from anon/authenticated at column level.
--    Reads must go through SECURITY DEFINER RPCs (get_content_player_url, get_episode_player_url,
--    get_content_links, get_episode_links, admin_get_contents_v2, admin_get_episodes).
REVOKE SELECT (player_url, links) ON public.contents FROM anon, authenticated;
REVOKE SELECT (player_url, links) ON public.episodes FROM anon, authenticated;

-- Grant back all the other columns explicitly so PostgREST selects still work.
GRANT SELECT (
  id, title, year, tag, type, banner_url, section, "position", is_premium, synopsis,
  is_archived, supporter_player_enabled, preview_video_url, created_at, updated_at
) ON public.contents TO anon, authenticated;

GRANT SELECT (
  id, content_id, title, episode_number, season, is_premium, created_at
) ON public.episodes TO anon, authenticated;

-- 2) supporter_events: remove direct INSERT; only log_supporter_event RPC may write.
DROP POLICY IF EXISTS "Authenticated can insert own supporter events" ON public.supporter_events;
REVOKE INSERT ON public.supporter_events FROM anon, authenticated;

-- 3) profiles: block regular users from writing premium fields at column level.
--    Admins use admin_set_profile_premium (SECURITY DEFINER); Stripe webhook uses service_role.
REVOKE UPDATE (is_premium, premium_plan, premium_expires_at) ON public.profiles FROM anon, authenticated;
