
-- 1) Hide player_url column from anon/authenticated SELECT to prevent unauthenticated premium URL leak.
-- Access goes through SECURITY DEFINER RPCs get_content_player_url / get_episode_player_url which enforce premium checks.
REVOKE SELECT ON public.contents FROM anon, authenticated;
REVOKE SELECT ON public.episodes FROM anon, authenticated;

GRANT SELECT (id, title, year, tag, type, banner_url, section, "position", is_premium, synopsis, is_archived, supporter_player_enabled, created_at, updated_at)
  ON public.contents TO anon, authenticated;

GRANT SELECT (id, content_id, title, episode_number, season, is_premium, created_at)
  ON public.episodes TO anon, authenticated;

-- 2) Prevent author_name spoofing on comments by overwriting with profile-derived name on insert.
CREATE OR REPLACE FUNCTION public.set_comment_author_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first text;
  v_last text;
  v_email text;
  v_name text;
BEGIN
  SELECT first_name, last_name, email INTO v_first, v_last, v_email
  FROM public.profiles WHERE user_id = auth.uid();

  v_name := nullif(trim(coalesce(v_first, '') || ' ' || coalesce(v_last, '')), '');
  IF v_name IS NULL AND v_email IS NOT NULL THEN
    v_name := split_part(v_email, '@', 1);
  END IF;
  NEW.author_name := coalesce(v_name, 'User');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_comment_author_name ON public.content_comments;
CREATE TRIGGER set_comment_author_name
BEFORE INSERT ON public.content_comments
FOR EACH ROW EXECUTE FUNCTION public.set_comment_author_name();
