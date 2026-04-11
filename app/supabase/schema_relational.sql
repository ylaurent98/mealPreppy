-- Mealpreppy relational schema (v2)
-- Run this full script in Supabase SQL Editor.

create table if not exists public.recipe_templates (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  default_servings integer not null default 1,
  default_cook_portions integer not null default 1,
  meal_type text not null default 'lunch',
  nutrition_source text not null default 'calculated',
  nutrition_per_serving jsonb not null default '{}'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.template_ingredients (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  id text not null,
  sort_index integer not null default 0,
  group_name text not null default '',
  name text not null,
  raw_text text not null default '',
  quantity numeric,
  unit text,
  category text not null default 'pantry',
  nutrition_per_100g jsonb,
  unit_grams jsonb,
  nutrition_per_unit jsonb,
  notes text,
  is_incomplete boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id, id),
  constraint template_ingredients_template_fk
    foreign key (user_id, template_id)
    references public.recipe_templates(user_id, id)
    on delete cascade
);

create table if not exists public.recipe_versions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  template_id text not null,
  week_start date not null,
  name text not null,
  servings integer not null default 1,
  cook_portions integer not null default 1,
  meal_type text not null default 'lunch',
  notes text not null default '',
  nutrition_per_serving jsonb not null default '{}'::jsonb,
  unresolved_ingredients integer not null default 0,
  instructions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_made_at timestamptz,
  primary key (user_id, id),
  constraint recipe_versions_template_fk
    foreign key (user_id, template_id)
    references public.recipe_templates(user_id, id)
    on delete cascade
);

create table if not exists public.version_ingredients (
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id text not null,
  id text not null,
  sort_index integer not null default 0,
  group_name text not null default '',
  name text not null,
  raw_text text not null default '',
  quantity numeric,
  unit text,
  category text not null default 'pantry',
  nutrition_per_100g jsonb,
  unit_grams jsonb,
  nutrition_per_unit jsonb,
  notes text,
  is_incomplete boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, version_id, id),
  constraint version_ingredients_version_fk
    foreign key (user_id, version_id)
    references public.recipe_versions(user_id, id)
    on delete cascade
);

create table if not exists public.ingredient_db (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  source text not null default 'user',
  category text not null default 'pantry',
  nutrition_per_100g jsonb not null default '{}'::jsonb,
  unit_grams jsonb not null default '{"g":1}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.meal_boxes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  recipe_version_id text not null,
  week_start date not null,
  label text not null default '',
  batch_id text not null,
  box_number integer not null default 1,
  portion_fraction numeric not null default 1,
  base_nutrition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint meal_boxes_version_fk
    foreign key (user_id, recipe_version_id)
    references public.recipe_versions(user_id, id)
    on delete cascade
);

create table if not exists public.extra_foods (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  week_start date not null,
  name text not null,
  meal_type text not null default 'snack',
  nutrition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.planner_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  week_start date not null,
  day_index integer not null,
  meal_type text not null default 'snack',
  source_type text not null,
  source_id text not null,
  consumed_fraction numeric not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.planner_weeks (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  title text not null default '',
  recipe_version_ids jsonb not null default '[]'::jsonb,
  box_ids jsonb not null default '[]'::jsonb,
  entry_ids jsonb not null default '[]'::jsonb,
  extra_food_ids jsonb not null default '[]'::jsonb,
  shopping_mode text not null default 'allVersions',
  default_daily_calorie_target numeric,
  daily_calorie_targets jsonb not null default '[null,null,null,null,null,null,null]'::jsonb,
  macro_target_percentages jsonb not null default '{"protein":30,"carbs":40,"fat":30}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.recipe_templates enable row level security;
alter table public.template_ingredients enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.version_ingredients enable row level security;
alter table public.ingredient_db enable row level security;
alter table public.meal_boxes enable row level security;
alter table public.extra_foods enable row level security;
alter table public.planner_entries enable row level security;
alter table public.planner_weeks enable row level security;

drop policy if exists "Users own recipe_templates" on public.recipe_templates;
create policy "Users own recipe_templates"
on public.recipe_templates
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own template_ingredients" on public.template_ingredients;
create policy "Users own template_ingredients"
on public.template_ingredients
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own recipe_versions" on public.recipe_versions;
create policy "Users own recipe_versions"
on public.recipe_versions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own version_ingredients" on public.version_ingredients;
create policy "Users own version_ingredients"
on public.version_ingredients
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own ingredient_db" on public.ingredient_db;
create policy "Users own ingredient_db"
on public.ingredient_db
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own meal_boxes" on public.meal_boxes;
create policy "Users own meal_boxes"
on public.meal_boxes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own extra_foods" on public.extra_foods;
create policy "Users own extra_foods"
on public.extra_foods
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own planner_entries" on public.planner_entries;
create policy "Users own planner_entries"
on public.planner_entries
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users own planner_weeks" on public.planner_weeks;
create policy "Users own planner_weeks"
on public.planner_weeks
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_recipe_versions_user_week
  on public.recipe_versions(user_id, week_start);
create index if not exists idx_meal_boxes_user_week
  on public.meal_boxes(user_id, week_start);
create index if not exists idx_extra_foods_user_week
  on public.extra_foods(user_id, week_start);
create index if not exists idx_planner_entries_user_week
  on public.planner_entries(user_id, week_start);
