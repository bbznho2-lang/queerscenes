
CREATE TABLE public.paywall_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL UNIQUE REFERENCES public.contents(id) ON DELETE CASCADE,
  custom_text text,
  testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paywall_customizations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.paywall_customizations TO authenticated;
GRANT ALL ON public.paywall_customizations TO service_role;

ALTER TABLE public.paywall_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read paywall customizations"
  ON public.paywall_customizations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage paywall customizations"
  ON public.paywall_customizations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_paywall_customizations_updated_at
  BEFORE UPDATE ON public.paywall_customizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
