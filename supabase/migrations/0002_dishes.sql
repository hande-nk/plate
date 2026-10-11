-- 0002_dishes.sql
-- menu_items (public, scraped) → dishes (private library, filled from screenshots)

-- 1. Unhook meals from the old table, then remove it
alter table meals drop column menu_item_id;
drop table menu_items;

-- 2. The private library
create table dishes (
    id bigint generated always as identity primary key,
    user_id uuid not null default auth.uid()
        references auth.users on delete cascade,
    hall text check (hall in ('carm', 'dewick', 'hodge', 'kindlevan')),            -- nullable: outside food has no hall
    name text not null,                         -- "AF O'Brien Potato"
    serving_size text,                          -- "4 oz", straight from parseLabel
    kcal numeric(6,1) not null check (kcal >= 0),
    protein_g numeric(5,1),
    carbs_g numeric(5,1),
    fat_g numeric(5,1),
    source text not null check (source in ('screenshot', 'label', 'usda')),
    created_at timestamptz not null default now(),
    unique nulls not distinct (user_id, hall, name)
);

alter table dishes enable row level security;

create policy "own dishes" on dishes
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);



-- 3. Point meals at the library
alter table meals add column dish_id bigint references dishes on delete set null;