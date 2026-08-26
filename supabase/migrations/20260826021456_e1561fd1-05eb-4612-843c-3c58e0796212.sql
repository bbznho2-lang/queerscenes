DO $$
DECLARE
  names text[] := ARRAY[
    'Lena Hoffmann','Jonas Weber','Mia Schneider','Felix Braun','Greta Vogel',
    'Emily Carter','Jordan Reyes','Ashley Brooks','Tyler Nguyen','Madison Cole',
    'Noah Bennett','Chloé Moreau','Lucas Fontaine','Camille Dubois','Théo Laurent',
    'Manon Girard','Sofia Rossi','Matteo Ricci','Giulia Conti','Alejandro Ruiz',
    'Lucía Fernández','Pablo Serrano','Sanne de Vries','Daan Bakker','Emma Jansen',
    'Oliver Hughes','Freya Walsh','Liam O''Connor','Erik Lindqvist','Astrid Nilsen',
    'Ingrid Larsen','Kasper Sørensen','Anya Petrova','Marek Kowalski','Zofia Nowak',
    'Ana Beatriz Lima','Rafael Moura','Renata Alves','Yuki Tanaka','Haruto Sato',
    'Min-seo Park','Ji-woo Kim','Nadia Haddad','Omar El-Amin','Isabel Costa',
    'Tomás Silva','Katja Meier','Simon Fischer','Elise Martin','Julien Bernard',
    'Hannah Ellis','Grace Whitfield','Dylan Foster','Nora Sinclair','Marta Vidal',
    'Karim Benali','Lea Baumann','Victor Ahlberg','Fiona Doyle','Paula Ortega'
  ];
  r record;
  i int := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.content_comments
    WHERE author_name IS NULL OR btrim(author_name) = '' OR author_name = 'User'
    ORDER BY content_id, created_at, id
  LOOP
    i := i + 1;
    UPDATE public.content_comments
      SET author_name = names[((i - 1) % array_length(names, 1)) + 1]
      WHERE id = r.id;
  END LOOP;
END $$;