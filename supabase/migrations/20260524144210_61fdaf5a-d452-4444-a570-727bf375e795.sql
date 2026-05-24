GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_content_ids(integer) TO anon, authenticated;