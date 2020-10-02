BEGIN;

INSERT INTO noteful_notes (note_name, folder_id, content)
VALUES
  ('Important note', 1, 'Nostrud ipsum veniam voluptate eiusmod adipisicing dolor pariatur laboris duis est adipisicing.'),
  ('Important note duo', 1, 'Nostrud ipsum veniam voluptate eiusmod adipisicing dolor pariatur laboris duis est adipisicing.'),
  ('Promotional note', 2, 'Anim eiusmod aute non ut laborum qui ex aliqua esse minim deserunt nulla laborum.'),
  ('Promotional note duo', 2, 'Anim eiusmod aute non ut laborum qui ex aliqua esse minim deserunt nulla laborum.'),
  ('Social note', 3, 'Veniam do consequat dolore minim ullamco mollit ad anim reprehenderit.'),
  ('Social note duo', 3, 'Veniam do consequat dolore minim ullamco mollit ad anim reprehenderit.'),
  ('Junk note', 4, 'Exercitation velit cillum anim est ut.'),
  ('Junk note duo', 4, 'Exercitation velit cillum anim est ut.'),
  ('Political note', 5, 'Nostrud sit quis fugiat voluptate ex adipisicing laboris nulla ut incididunt aute excepteur et.'),
  ('Political note duo', 5, 'Nostrud sit quis fugiat voluptate ex adipisicing laboris nulla ut incididunt aute excepteur et.'),
  ('Anime note', 6, 'Nulla dolore adipisicing elit consectetur ullamco laboris velit amet.'),
  ('Anime note duo', 6, 'Nulla dolore adipisicing elit consectetur ullamco laboris velit amet.');

COMMIT;