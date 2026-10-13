-- How many pieces make one serving. null = not countable, estimate by area.
alter table dishes
  add column if not exists count_per_serving numeric(4,1)
  check (count_per_serving > 0);

-- Auto-fill the easy ones: servings like "4 each"
update dishes
set count_per_serving = (regexp_match(serving_size, '^\s*(\d+(?:\.\d+)?)\s*each', 'i'))[1]::numeric
where count_per_serving is null
  and serving_size ~* '^\s*\d+(\.\d+)?\s*each';