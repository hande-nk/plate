-- 0013: clues 4 and 5 to Story v2 (approved Nov 6), plus the clue 2 Hodgdon fix in case it wasn't run.

update public.clues set
  body = 'Over at Hodgdon, a ladle vanished from the soup station. I blame the salad bar. Priya says the salad bar "was just standing there." Kuzum, you were there. What did you see?'
where ord = 2;

update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You had the {dish}.]',
  body  = 'The Carm twins cornered me at the omelet station. "Someone bakes at Kindlevan every night," said one. "Alone," said the other. "We didn''t hear it from us." Kuzum, nobody bakes alone at midnight for fun.'
where ord = 4;

update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You had the {dish}.]',
  body  = 'A postcard from Kadıköy, 1987, in a Medford thrift shop. On the back, five words: "Don''t forget the dried mint." Signed only "H." Dr. Pruitt reached for it first. I paid in exact change. Kuzum, write this down: H.'
where ord = 5;

select ord, title, frame, left(body, 40) as starts from public.clues where ord between 2 and 5 order by ord;