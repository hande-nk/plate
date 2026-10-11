create table profiles (
    id bigint generated always as identity primary key,
    user_id uuid not null unique default auth.uid()
        references auth.users on delete cascade,
    height_cm numeric (3) not null check (height_cm between 100 and 300),
    age numeric (3) not null check (age between 17 and 100),
    sex text not null check (sex in ('female', 'male')),
    activity text not null check (activity in ('light', 'moderate', 'active')),
    pace text not null check (pace in ('gentle', 'steady', 'track'))
);

alter table profiles enable row level security;

create policy "own profiles" on profiles
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create table menu_items(
    id bigint generated always as identity primary key,
    hall text not null check (hall in ('carm', 'dewick', 'hodge', 'kindlevan')),
    day date not null,
    meal text not null check (meal in ('breakfast', 'brunch', 'lunch', 'dinner', 'snack')),
    name text not null,
    kcal numeric(6,1) not null check (kcal >= 0),
    protein_g numeric(5,1),
    carbs_g numeric(5,1),
    fat_g numeric(5,1),
    unique (hall, day, meal, name)
);

alter table menu_items enable row level security;

create policy "anyone can read menus" on menu_items
    for select using (true);

create table weigh_ins (
    id bigint generated always as identity primary key,
    user_id uuid not null default auth.uid()
        references auth.users on delete cascade,
    day date not null,
    kg numeric(5,2) not null check (kg between 30 and 250),
    created_at timestamptz not null default now(),
    unique (user_id, day)
);

alter table weigh_ins enable row level security;

create policy "own weigh-ins" on weigh_ins
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


create table meals (
    id bigint generated always as identity primary key,
    user_id uuid not null default auth.uid()
        references auth.users on delete cascade,
    eaten_at timestamptz not null default now(),
    route text not null
        check (route in ('plate', 'hodgdon-box', 'tufts-packaged', 'outside-snack', 'app-order')),
    dish_name text not null,
    menu_item_id bigint references menu_items on delete set null,
    kcal numeric(6,1) not null check (kcal >= 0),
    protein_g numeric(5,1),
    carbs_g numeric(5,1),
    fat_g numeric(5,1),
    portion numeric(3,2) not null default 1,
    feeling text check (feeling in ('energized', 'satisfied', 'heavy', 'hungry')),
    photo_key text
);

alter table meals enable row level security;

create policy "own meals" on meals
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);