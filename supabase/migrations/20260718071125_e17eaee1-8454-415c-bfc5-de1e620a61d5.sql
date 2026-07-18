GRANT SELECT ON public.contents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT ALL ON public.contents TO service_role;

GRANT SELECT ON public.episodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.current_user_can_play_premium()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role = 'admin'::public.app_role
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = v_user_id
      AND p.is_premium = true
      AND (p.premium_expires_at IS NULL OR p.premium_expires_at > now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_play_premium() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_episode_links(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_episode_player_url(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_content_links(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_content_player_url(uuid) TO anon, authenticated, service_role;