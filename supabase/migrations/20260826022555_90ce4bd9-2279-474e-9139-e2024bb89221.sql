
ALTER TABLE public.content_comments DISABLE TRIGGER USER;

DELETE FROM public.content_comments WHERE created_at::text LIKE '%.301192%';

WITH v(content_id, author_name, body, ts) AS (
  VALUES
  -- Girls Like Girls (A)
  ('1a644b97-a43c-434f-a5b9-4085707bd7d5','Lena Hoffmann','coley and sonya''s dynamic is messy in the best way lol', now() - interval '21 days 4 hours 12 minutes'),
  ('1a644b97-a43c-434f-a5b9-4085707bd7d5','Tyler Nguyen','the pool scene lives in my head', now() - interval '17 days 22 hours 47 minutes'),
  ('1a644b97-a43c-434f-a5b9-4085707bd7d5','Chloé Moreau','i had the song on repeat before this and now it''s worse', now() - interval '11 days 13 hours 5 minutes'),
  ('1a644b97-a43c-434f-a5b9-4085707bd7d5','Astrid Nilsen','watched it with my sister and we both went quiet at the end', now() - interval '4 days 20 hours 31 minutes'),
  -- Girls Like Girls (B)
  ('988c2cce-a640-4795-81a5-43b72f7e18e8','Mia Schneider','the summer heat in this is so well shot', now() - interval '25 days 15 hours 41 minutes'),
  ('988c2cce-a640-4795-81a5-43b72f7e18e8','Madison Cole','took me back to being 17 and confused lol', now() - interval '19 days 8 hours 55 minutes'),
  ('988c2cce-a640-4795-81a5-43b72f7e18e8','Zofia Nowak','sonya deserved better honestly', now() - interval '9 days 23 hours 18 minutes'),
  -- Heated Rivalry
  ('2636628a-28ad-47de-a918-05d6bf3c26df','Noah Bennett','ilya and shane are going to ruin my sleep schedule', now() - interval '23 days 2 hours 14 minutes'),
  ('2636628a-28ad-47de-a918-05d6bf3c26df','Giulia Conti','the hotel room scenes... i need a minute', now() - interval '16 days 19 hours 38 minutes'),
  ('2636628a-28ad-47de-a918-05d6bf3c26df','Felix Braun','as a hockey hater i''m now watching hockey', now() - interval '12 days 7 hours 29 minutes'),
  ('2636628a-28ad-47de-a918-05d6bf3c26df','Anya Petrova','the way they act with just their eyes, insane', now() - interval '5 days 21 hours 50 minutes'),
  -- Her Private Hell
  ('c9be444d-ddc0-4ff8-ae50-d04623ddf624','Simon Fischer','1968 and it still feels bolder than most stuff today', now() - interval '27 days 18 hours 22 minutes'),
  ('c9be444d-ddc0-4ff8-ae50-d04623ddf624','Elise Martin','the swinging london vibe is unreal, the styling especially', now() - interval '14 days 10 hours 47 minutes'),
  ('c9be444d-ddc0-4ff8-ae50-d04623ddf624','Julien Bernard','the black and white photography here is stunning', now() - interval '6 days 16 hours 9 minutes'),
  -- Leviticus (A)
  ('9c9b5e7d-73d6-4290-bb36-6f46da2e6a1e','Jonas Weber','eduard''s whole conflict wrecked me, i grew up in church too', now() - interval '26 days 9 hours 33 minutes'),
  ('9c9b5e7d-73d6-4290-bb36-6f46da2e6a1e','Nora Sinclair','the kiss in the church, my chest actually hurt', now() - interval '13 days 22 hours 11 minutes'),
  ('9c9b5e7d-73d6-4290-bb36-6f46da2e6a1e','Yuki Tanaka','short but it says more than most feature films', now() - interval '7 days 12 hours 26 minutes'),
  -- Leviticus (B)
  ('e252222e-0843-43dd-9868-422af87baeb9','Grace Whitfield','mathew looking at him during mass, that''s it that''s the film', now() - interval '20 days 6 hours 48 minutes'),
  ('e252222e-0843-43dd-9868-422af87baeb9','Rafael Moura','religious guilt shown without being cruel about it, rare', now() - interval '15 days 17 hours 53 minutes'),
  ('e252222e-0843-43dd-9868-422af87baeb9','Marta Vidal','watched it twice to catch the details in the last scene', now() - interval '3 days 14 hours 37 minutes'),
  -- My Summer of Love
  ('6371aeb4-f617-42cb-90c3-0e8b4eb9ef80','Alejandro Ruiz','mona and tamsin''s summer is toxic and i can''t look away', now() - interval '28 days 11 hours 19 minutes'),
  ('6371aeb4-f617-42cb-90c3-0e8b4eb9ef80','Lucía Fernández','emily blunt in this??? she was so young', now() - interval '22 days 20 hours 4 minutes'),
  ('6371aeb4-f617-42cb-90c3-0e8b4eb9ef80','Pablo Serrano','that yorkshire countryside makes the whole thing feel dreamy', now() - interval '18 days 8 hours 41 minutes'),
  ('6371aeb4-f617-42cb-90c3-0e8b4eb9ef80','Sanne de Vries','the ending is so cold and so perfect', now() - interval '8 days 23 hours 57 minutes'),
  -- Sterling Point
  ('5cffd64b-04c8-439d-a0fc-5b2af98e7096','Daan Bakker','annie inheriting an island and finding a whole family secret, i''m hooked', now() - interval '24 days 13 hours 26 minutes'),
  ('5cffd64b-04c8-439d-a0fc-5b2af98e7096','Ingrid Larsen','the island setting is gorgeous, cold and cozy at the same time', now() - interval '11 days 7 hours 44 minutes'),
  ('5cffd64b-04c8-439d-a0fc-5b2af98e7096','Hannah Ellis','the sisterhood storyline is the best part honestly', now() - interval '2 days 19 hours 23 minutes'),
  -- The Jetty
  ('c072db33-1ea1-4c89-9fe4-7190e5364675','Dylan Foster','the mystery had me suspecting literally everyone', now() - interval '21 days 16 hours 35 minutes'),
  ('c072db33-1ea1-4c89-9fe4-7190e5364675','Ana Beatriz Lima','the lake town atmosphere is so heavy, love it', now() - interval '10 days 9 hours 58 minutes'),
  ('c072db33-1ea1-4c89-9fe4-7190e5364675','Lucas Fontaine','ember is such a frustrating and human lead', now() - interval '4 days 22 hours 7 minutes'),
  -- Três Graças
  ('1af54342-5dac-4859-b5bd-7da04aef7349','Renata Alves','a novela that actually gives the queer couple real screen time', now() - interval '23 days 10 hours 12 minutes'),
  ('1af54342-5dac-4859-b5bd-7da04aef7349','Camille Dubois','i started for one storyline and now i''m watching all of them lol', now() - interval '17 days 19 hours 29 minutes'),
  ('1af54342-5dac-4859-b5bd-7da04aef7349','Sofia Ricci','the subtitles here made it finally watchable for me', now() - interval '6 days 8 hours 33 minutes'),
  -- Vermelho Sangue
  ('b079720c-5e0d-4f58-90ad-69d13695bddd','Emma Larsson','did not expect it to get that dark that fast', now() - interval '26 days 21 hours 6 minutes'),
  ('b079720c-5e0d-4f58-90ad-69d13695bddd','Nils Andersson','the tension between the leads is unreal', now() - interval '12 days 15 hours 44 minutes'),
  ('b079720c-5e0d-4f58-90ad-69d13695bddd','Paula Ortiz','binged three episodes without meaning to', now() - interval '5 days 7 hours 19 minutes'),
  ('b079720c-5e0d-4f58-90ad-69d13695bddd','Théo Girard','the end of episode 4 made me gasp out loud', now() - interval '1 day 20 hours 52 minutes'),
  -- Young Hearts
  ('6b56d35c-3a2c-470d-8829-7e1c2c09202f','Klara Nowicka','elias figuring himself out felt so painfully honest', now() - interval '29 days 12 hours 3 minutes'),
  ('6b56d35c-3a2c-470d-8829-7e1c2c09202f','Matthias Keller','belgian films always hit different, this one especially', now() - interval '16 days 8 hours 26 minutes'),
  ('6b56d35c-3a2c-470d-8829-7e1c2c09202f','Aiko Mori','the bike scenes are so simple and so tender', now() - interval '9 days 18 hours 14 minutes'),
  ('6b56d35c-3a2c-470d-8829-7e1c2c09202f','Owen Carter','no drama for drama''s sake, just soft and real', now() - interval '2 days 22 hours 36 minutes')
)
INSERT INTO public.content_comments (content_id, user_id, author_name, body, created_at)
SELECT v.content_id::uuid, p.user_id, v.author_name, v.body, v.ts
FROM v
CROSS JOIN LATERAL (SELECT user_id FROM public.profiles ORDER BY random() LIMIT 1) p;

-- replies
WITH r(parent_body, author_name, body, ts) AS (
  VALUES
  ('i had the song on repeat before this and now it''s worse','Ingrid Larsen','same, the soundtrack does something to you', now() - interval '10 days 9 hours 16 minutes'),
  ('the summer heat in this is so well shot','Felix Braun','right, every frame looks like a memory', now() - interval '24 days 11 hours 2 minutes'),
  ('the way they act with just their eyes, insane','Madison Cole','the eye contact is doing more than most dialogue lol', now() - interval '5 days 23 hours 5 minutes'),
  ('the black and white photography here is stunning','Hannah Ellis','agreed, some shots look like fashion editorials', now() - interval '6 days 12 hours 44 minutes'),
  ('eduard''s whole conflict wrecked me, i grew up in church too','Marta Vidal','same here, felt way too familiar', now() - interval '25 days 20 hours 15 minutes'),
  ('watched it twice to catch the details in the last scene','Yuki Tanaka','the last scene is doing so much quietly', now() - interval '3 days 10 hours 2 minutes'),
  ('the ending is so cold and so perfect','Giulia Conti','the ending changed how i saw the whole film', now() - interval '7 days 9 hours 12 minutes'),
  ('the sisterhood storyline is the best part honestly','Astrid Nilsen','yes! the friendships carry the whole season', now() - interval '2 days 15 hours 40 minutes'),
  ('the subtitles here made it finally watchable for me','Ana Beatriz Lima','same, i couldn''t find decent subs anywhere else', now() - interval '5 days 21 hours 50 minutes'),
  ('binged three episodes without meaning to','Nils Andersson','same thing happened to me lol, there goes my night', now() - interval '4 days 10 hours 28 minutes'),
  ('no drama for drama''s sake, just soft and real','Klara Nowicka','exactly, it''s gentle and that''s why it works', now() - interval '2 days 9 hours 48 minutes')
)
INSERT INTO public.content_comments (content_id, user_id, author_name, body, created_at, parent_id)
SELECT pc.content_id, p.user_id, r.author_name, r.body, r.ts, pc.id
FROM r
JOIN public.content_comments pc ON pc.body = r.parent_body AND pc.parent_id IS NULL
CROSS JOIN LATERAL (SELECT user_id FROM public.profiles ORDER BY random() LIMIT 1) p;

ALTER TABLE public.content_comments ENABLE TRIGGER USER;
