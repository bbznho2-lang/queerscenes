-- Protect premium streaming URLs/links from direct table reads while keeping public catalog metadata readable.

-- CONTENTS: remove broad direct read access, then grant only safe catalog columns to public roles.
REVOKE SELECT ON public.contents FROM anon;
REVOKE SELECT ON public.contents FROM authenticated;
REVOKE SELECT ON public.contents FROM service_role;

GRANT SELECT (
  id,
  title,
  year,
  tag,
  type,
  banner_url,
  section,
  "position",
  created_at,
  updated_at,
  is_premium,
  synopsis,
  is_archived,
  supporter_player_enabled,
  preview_video_url
) ON public.contents TO anon;

GRANT SELECT (
  id,
  title,
  year,
  tag,
  type,
  banner_url,
  section,
  "position",
  created_at,
  updated_at,
  is_premium,
  synopsis,
  is_archived,
  supporter_player_enabled,
  preview_video_url
) ON public.contents TO authenticated;

-- service_role keeps full maintenance access.
GRANT SELECT ON public.contents TO service_role;

-- Keep authenticated admin mutations available under existing admin-only RLS policies.
GRANT INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT ALL ON public.contents TO service_role;

-- EPISODES: remove broad direct read access, then grant only safe episode metadata to public roles.
REVOKE SELECT ON public.episodes FROM anon;
REVOKE SELECT ON public.episodes FROM authenticated;
REVOKE SELECT ON public.episodes FROM service_role;

GRANT SELECT (
  id,
  content_id,
  title,
  episode_number,
  created_at,
  season,
  is_premium
) ON public.episodes TO anon;

GRANT SELECT (
  id,
  content_id,
  title,
  episode_number,
  created_at,
  season,
  is_premium
) ON public.episodes TO authenticated;

-- service_role keeps full maintenance access.
GRANT SELECT ON public.episodes TO service_role;

-- Keep authenticated admin mutations available under existing admin-only RLS policies.
GRANT INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;

-- Protected playback/admin functions remain the only route for raw player_url/links.
GRANT EXECUTE ON FUNCTION public.get_content_player_url(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_content_links(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_episode_player_url(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_episode_links(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_contents(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_contents_v2(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_episodes(uuid) TO authenticated, service_role;