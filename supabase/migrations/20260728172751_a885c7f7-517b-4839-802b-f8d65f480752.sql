DROP POLICY IF EXISTS "Admins can view deletions" ON public.account_deletions;
CREATE POLICY "Admins can view deletions"
ON public.account_deletions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage canceled subs" ON public.canceled_subscriptions;
CREATE POLICY "Admins manage canceled subs"
ON public.canceled_subscriptions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));