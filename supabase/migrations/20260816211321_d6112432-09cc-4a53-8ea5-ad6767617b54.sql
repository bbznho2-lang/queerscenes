CREATE TABLE public.social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  icon text not null default 'link',
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.social_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_links TO authenticated;
GRANT ALL ON public.social_links TO service_role;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active social links" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Admins can insert social links" ON public.social_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update social links" ON public.social_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete social links" ON public.social_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_social_links_updated_at BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.social_links (label, href, icon, position) VALUES
 ('Instagram','https://www.instagram.com/queer.scenes','instagram',1),
 ('TikTok','https://www.tiktok.com/@queer.scenes','tiktok',2),
 ('X','https://x.com/queerscenes','x',3),
 ('YouTube','https://youtube.com/@queerscenestv?si=8mlUwn2WVYa-g-e5','youtube',4);