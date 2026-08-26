
DO $$
DECLARE
  v_content record;
  v_names text[] := ARRAY['Ashley','Layla','Camille','Lena','Noor','Manon','Mila','Hannah','Yasmin','Elin','Alina','Chloé','Anouk','Léa','Taylor','Lucas','Mariam','Greta','Rachel','Salma','Juliette','Zahra','Emily','Omar','Inès','Aisha','Megan','Kayla','Felix','Khalid'];
  v_series text[] := ARRAY[
    'binged this in one night lol no regrets',
    'the chemistry between them is INSANE',
    'ep 4 destroyed me i had to pause',
    'ok who else screamed at that ending',
    'the subs are actually good here, finally',
    'i keep rewatching the last scene help',
    'this deserves way more hype than it got',
    'started casually and now it''s my whole personality',
    'the soundtrack?? obsessed',
    'came back to rewatch this again lol'
  ];
  v_movie text[] := ARRAY[
    'this wrecked me, still not over it',
    'watched it twice already ngl',
    'the last ten minutes.. i''m emotional',
    'so underrated it''s criminal',
    'been looking for this forever, finally found it',
    'cried like a baby, 10/10',
    'quiet, slow and completely worth it',
    'the cinematography is gorgeous',
    'my partner and i watched it together, we loved it',
    'this one stays with you for days'
  ];
  v_replies text[] := ARRAY[
    'same!! i thought i was the only one',
    'omg yes exactly this',
    'agreed, easily one of my favs here',
    'you put it perfectly lol',
    'right?? i need more like this'
  ];
  v_pool text[];
  v_count int;
  v_i int;
  v_parent uuid;
  v_name text;
  v_when timestamptz;
BEGIN
  FOR v_content IN
    SELECT c.id, c.title, c.type,
      (SELECT count(*) FROM public.content_clicks k WHERE k.content_id = c.id AND k.clicked_at > now() - interval '60 days') AS clicks
    FROM public.contents c
    WHERE coalesce(c.is_archived, false) = false
    ORDER BY clicks DESC
    LIMIT 12
  LOOP
    -- Skip titles that already have community activity seeded
    IF (SELECT count(*) FROM public.content_comments cc WHERE cc.content_id = v_content.id) >= 3 THEN
      CONTINUE;
    END IF;

    v_pool := CASE WHEN v_content.type IN ('serie','novela','reality','anime') THEN v_series ELSE v_movie END;
    v_count := 3 + (abs(hashtext(v_content.id::text)) % 3); -- 3..5 comments

    FOR v_i IN 0..(v_count - 1) LOOP
      v_name := v_names[1 + ((abs(hashtext(v_content.id::text || v_i::text)) ) % array_length(v_names, 1))];
      v_when := now() - ((3 + v_i * 4 + (abs(hashtext(v_content.id::text || v_i::text)) % 5)) || ' days')::interval;

      INSERT INTO public.content_comments (content_id, user_id, author_name, body, created_at)
      VALUES (
        v_content.id,
        gen_random_uuid(),
        v_name,
        v_pool[1 + ((abs(hashtext(v_content.id::text || 'c' || v_i::text))) % array_length(v_pool, 1))],
        v_when
      )
      RETURNING id INTO v_parent;

      -- one reply on the first comment of each title
      IF v_i = 0 THEN
        INSERT INTO public.content_comments (content_id, user_id, author_name, body, created_at, parent_id)
        VALUES (
          v_content.id,
          gen_random_uuid(),
          v_names[1 + ((abs(hashtext(v_content.id::text || 'r'))) % array_length(v_names, 1))],
          v_replies[1 + ((abs(hashtext(v_content.id::text || 'rr'))) % array_length(v_replies, 1))],
          v_when + interval '6 hours',
          v_parent
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
