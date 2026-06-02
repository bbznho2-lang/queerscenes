-- Ensure basic table permissions for authenticated users
-- RLS policies already restrict these to users with the 'admin' role
GRANT INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.episodes TO authenticated;

-- Ensure service_role has full access
GRANT ALL ON public.contents TO service_role;
GRANT ALL ON public.episodes TO service_role;

-- Make sure the sequence for position (if any) is accessible, 
-- though it's currently a default 0.
