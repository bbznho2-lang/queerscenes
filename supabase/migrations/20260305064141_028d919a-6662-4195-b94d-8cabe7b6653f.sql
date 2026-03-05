ALTER TABLE public.contents DROP CONSTRAINT contents_type_check;
ALTER TABLE public.contents ADD CONSTRAINT contents_type_check CHECK (type = ANY (ARRAY['serie'::text, 'filme'::text, 'novela'::text, 'anime'::text]));

ALTER TABLE public.contents DROP CONSTRAINT contents_section_check;
ALTER TABLE public.contents ADD CONSTRAINT contents_section_check CHECK (section = ANY (ARRAY['series'::text, 'filmes'::text, 'novelas'::text, 'animes'::text, 'exclusivos'::text]));