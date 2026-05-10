
-- Site notes (announcement banner)
CREATE TABLE public.site_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Announcement',
  body TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#7c3aed',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site notes" ON public.site_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert site notes" ON public.site_notes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update site notes" ON public.site_notes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete site notes" ON public.site_notes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_site_notes_updated_at BEFORE UPDATE ON public.site_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Featured episodes (Recent Updates curated list)
CREATE TABLE public.featured_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id UUID NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view featured episodes" ON public.featured_episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert featured episodes" ON public.featured_episodes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update featured episodes" ON public.featured_episodes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete featured episodes" ON public.featured_episodes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
