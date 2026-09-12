REVOKE ALL ON FUNCTION public.admin_grant_supporter_by_email(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_supporter_by_email(text, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_supporter_by_email(text, text, timestamptz) TO authenticated;