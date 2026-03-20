CREATE POLICY "Anon can view contents"
ON public.contents FOR SELECT TO anon
USING (true);