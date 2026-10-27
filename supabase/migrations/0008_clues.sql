create table clues (
  id smallint primary key,
  case_no smallint not null,
  ord smallint not null check (ord between 1 and 8),
  title text not null,
  body text not null,
  place text,
  unique (case_no, ord)
);
alter table clues enable row level security;
create policy "anyone logged in reads clues" on clues for select to authenticated using (true);

create table user_clues (
  user_id uuid not null references auth.users on delete cascade,
  clue_id smallint not null references clues,
  found_at timestamptz not null default now(),
  plate_at timestamptz not null,
  primary key (user_id, clue_id)
);
alter table user_clues enable row level security;
create policy "own clues" on user_clues for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into clues (id, case_no, ord, title, body, place) values
(1, 1, 1, 'The case opens', 'Kuzum, you logged a plate. Good. A detective needs a partner who writes things down. Our case: a lentil soup that tastes exactly like my grandmother''s. In 1987 her recipe vanished from Kadıköy. Coincidence? We will see.', 'Carm'),
(2, 1, 2, 'The ladle', 'A ladle went missing at Hodgdon on Tuesday. Nobody is admitting anything. I am not saying it is connected. I am writing it down.', 'Hodgdon'),
(3, 1, 3, 'Too much cumin', 'Dewick''s lentil soup uses cumin the way my grandmother did: too much, on purpose. Most cooks are afraid of cumin. This one is not.', 'Dewick'),
(4, 1, 4, 'The schedule', 'The haddock was here Thursday too. Same lemon, same pan. Somebody in that kitchen keeps a schedule, kuzum. People with schedules keep recipes.', 'Carm'),
(5, 1, 5, 'A postcard', 'My nephew found a 1987 postcard from Kadıköy in a Medford thrift shop. It says only: ''Don''t forget the dried mint.'' Dewick forgets nothing.', null),
(6, 1, 6, 'The night cook', 'Kindlevan''s night cook hums a song from the Kadıköy ferries. I hummed back. He stopped. A man who stops humming has something to hide. Or he forgot the words.', 'Kindlevan'),
(7, 1, 7, 'The mint', 'Dried mint, burned in butter, poured on top. Dewick did it on Monday. My grandmother did it every winter. Two kitchens, one hand.', 'Dewick'),
(8, 1, 8, 'Case closed', 'It was never stolen, kuzum. The cook''s grandmother learned it in Kadıköy, from mine. Recipes don''t get stolen. They get passed on. Like the habit of writing things down.', 'Dewick');