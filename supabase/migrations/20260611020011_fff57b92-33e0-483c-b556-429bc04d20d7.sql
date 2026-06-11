
-- 1) Remove anon access to supporter status lookup
REVOKE EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supporter_user_ids(uuid[]) TO authenticated;

-- 2) Block non-admin users from updating premium columns on profiles
--    Existing trigger (protect_profile_premium_fields) silently reverts;
--    column-level revoke makes the protection explicit and impossible to bypass via direct UPDATE.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  first_name,
  last_name,
  email
) ON public.profiles TO authenticated;
-- service_role keeps full access for Stripe webhook
GRANT ALL ON public.profiles TO service_role;

-- 3) Explicit deny-insert policy on pending_supporters (only service_role inserts via Stripe webhook)
DROP POLICY IF EXISTS "No client inserts on pending_supporters" ON public.pending_supporters;
CREATE POLICY "No client inserts on pending_supporters"
  ON public.pending_supporters
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);
