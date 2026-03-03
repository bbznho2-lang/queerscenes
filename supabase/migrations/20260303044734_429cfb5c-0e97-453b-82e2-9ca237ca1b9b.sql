
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Contents table (series & films)
CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Novo Título',
  year INT NOT NULL DEFAULT 2025,
  tag TEXT NOT NULL DEFAULT 'Drama',
  type TEXT NOT NULL DEFAULT 'filme' CHECK (type IN ('serie', 'filme')),
  banner_url TEXT,
  player_url TEXT,
  section TEXT NOT NULL DEFAULT 'series' CHECK (section IN ('series', 'filmes', 'exclusivos')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

-- Everyone can read contents
CREATE POLICY "Anyone can view contents"
ON public.contents FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify contents
CREATE POLICY "Admins can insert contents"
ON public.contents FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contents"
ON public.contents FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contents"
ON public.contents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Episodes table
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.contents(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Episódio',
  episode_number INT NOT NULL DEFAULT 1,
  player_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view episodes"
ON public.episodes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert episodes"
ON public.episodes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update episodes"
ON public.episodes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete episodes"
ON public.episodes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_contents_updated_at
BEFORE UPDATE ON public.contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for banners
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

CREATE POLICY "Anyone can view banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Admins can upload banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
