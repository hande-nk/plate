-- 0014: clue 6 to Story v2 (approved Nov 6).
update public.clues set
  frame = '[{hall}, ]{day}, {time}.[ You had the {dish}.]',
  body  = 'Midnight at Kindlevan. I hummed two lines of my grandmother''s ferry song. The night baker, Hüseyin Usta, stopped humming. Then Feride sent a voice note: "Safiye''ciğim, don''t be angry, but that is Nevin''s song. Nobody else knows it." Kuzum, the next morning he quit the night shift. Without a word.'
where ord = 6;
select ord, title, left(body, 50) as starts from public.clues where ord = 6;