-- Restore INSERT/UPDATE/DELETE on contents & episodes for authenticated users (RLS still limits to admins)
GRANT INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.contents TO service_role;
GRANT ALL ON public.episodes TO service_role;