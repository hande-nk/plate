-- 0012: Story v2 (T37). Clues become scenes framed by the plate that found them.
-- Lines below are the ones Naz approved on Nov 4 (clue 3's opener trimmed so it reads right without a feeling).

alter table public.clues add column if not exists frame text not null default '{day}, {time}.';
alter table public.clues add column if not exists choice_prompt text;          -- shown at the end of this clue
alter table public.clues add column if not exists choice_options jsonb;        -- [{"id":"priya","label":"Priya"}, ...]
alter table public.clues add column if not exists choice_lines jsonb;          -- extra line in THIS clue, keyed by the earlier choice
alter table public.clues add column if not exists choice_from int;             -- which clue's choice picks the line

alter table public.user_clues add column if not exists choice text;            -- your answer to that clue's choice_prompt
alter table public.profiles add column if not exists mention_dishes boolean not null default true;

update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You had the {dish}.]',
  body  = 'I was two tables away, kuzum, and I smelled it: lentils, cumin, 1987. My grandmother Nevin''s soup is on this campus. Case No. 1 is open. Write that down.'
where ord = 1;

update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You were waiting for your {dish}.]',
  body  = 'A ladle vanished from the soup station. I blame the salad bar. Priya says the salad bar "was just standing there." Kuzum, you were there. What did you see?',
  choice_prompt  = 'Who do we watch this week?',
  choice_options = '[{"id":"priya","label":"Priya"},{"id":"bar","label":"The salad bar"}]'
where ord = 2;

update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You said the {dish} left you {feeling}.]',
  body  = 'I was at Dewick with a spoon. Dewick''s lentil soup uses cumin the way my grandmother did: too much, on purpose. Most cooks are afraid of cumin. This one is not.',
  choice_from  = 2,
  choice_lines = '{"priya":"Priya saw me leave Dewick and pretended to read the menu. Upside down.","bar":"The salad bar was at Hodgdon the whole time. Suspicious, how it never leaves."}'
where ord = 3;

-- user_clues already has "own rows" RLS; your choice is an update on your own row.
select ord, title, frame, choice_prompt is not null as asks, choice_from from public.clues order by ord;