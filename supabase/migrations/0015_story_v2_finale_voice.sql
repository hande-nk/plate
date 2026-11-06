-- 0015: clues 7 and 8 (the finale) + voice notes. Lines pending Naz's approval: run only after she says yes.

alter table public.clues add column if not exists voice jsonb;   -- {"who":"Feride","text":"..."}

update public.clues set voice = '{"who":"Feride","text":"Safiye''ciğim, don''t be angry, but that is Nevin''s song. Nobody else knows it."}'
where ord = 6;

update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You had the {dish}.]',
  body  = 'Big Sal finally put down his ladle. "Hüseyin taught me this soup," he said. "Twenty years ago. Dried mint at the end, never at the start." Then Dr. Pruitt called: her chapter goes to the printer on Friday, with or without a name. Kuzum, this one is yours to decide.',
  choice_prompt  = 'What do we tell Dr. Pruitt?',
  choice_options = '[{"id":"tell","label":"Tell Pruitt"},{"id":"protect","label":"Protect Hüseyin"}]'
where ord = 7;

update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You had the {dish}.]',
  body  = 'That night someone knocked on Kerem''s door. Hüseyin Usta, holding a blue notebook. His grandmother was Nevin''s student in Kadıköy. Before she moved to Boston in 1987, she copied every recipe by hand, margins and all. Nothing was stolen, kuzum. It was passed on. Kerem made çay. Hüseyin made the soup. I cried a little. The cumin.',
  choice_from  = 7,
  choice_lines = '{"tell":"Dr. Pruitt got her chapter, and Hüseyin''s grandmother got a footnote, her name spelled right. I checked. Case closed. Kuzum, you have been keeping a notebook too.","protect":"Dr. Pruitt got a very polite letter from me. Her chapter is now about the salad bar. Case closed. Kuzum, you have been keeping a notebook too."}'
where ord = 8;

select ord, title, choice_prompt is not null as asks, choice_from, voice is not null as has_voice from public.clues where ord >= 6 order by ord;