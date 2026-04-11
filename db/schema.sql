-- Mealpreppy database schema
-- Target: PostgreSQL 15+
--
-- Notes:
-- 1. Weekly meal plans are historical snapshots.
-- 2. Default recipes are templates; recipe_versions are week-specific copies.
-- 3. Ingredient conversions are ingredient-specific via ingredient_measure_conversions.
-- 4. Shopping lists are persisted so historical weeks remain reproducible.

create extension if not exists pgcrypto;

create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type grocery_category as enum ('pantry', 'fruit_veg', 'meat_dairy');
create type nutrition_source_type as enum (
  'manual',
  'ingredient_rollup',
  'product_rollup',
  'external_lookup',
  'mixed'
);
create type meal_plan_status as enum ('draft', 'finalized', 'archived');
create type meal_box_status as enum (
  'available',
  'assigned',
  'partially_assigned',
  'consumed',
  'deleted'
);
create type meal_entry_kind as enum ('meal_box', 'standalone_food');
create type shopping_list_basis as enum ('assigned_entries', 'all_recipe_versions');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  timezone text not null default 'Europe/Bucharest',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  name text not null,
  normalized_name text,
  category text,
  default_grocery_category grocery_category,
  calories_per_100g numeric(10,2) not null default 0 check (calories_per_100g >= 0),
  protein_g_per_100g numeric(10,2) not null default 0 check (protein_g_per_100g >= 0),
  carbs_g_per_100g numeric(10,2) not null default 0 check (carbs_g_per_100g >= 0),
  fat_g_per_100g numeric(10,2) not null default 0 check (fat_g_per_100g >= 0),
  density_g_per_ml numeric(10,4) check (density_g_per_ml > 0),
  source_type text not null default 'manual',
  external_source_name text,
  external_source_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ingredient_measure_conversions (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  unit text not null,
  amount numeric(10,3) not null default 1 check (amount > 0),
  grams_equivalent numeric(10,3) not null check (grams_equivalent > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ingredient_id, unit, amount)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete set null,
  brand_name text not null,
  product_name text not null,
  barcode text,
  serving_size_amount numeric(10,3) check (serving_size_amount > 0),
  serving_size_unit text,
  grams_per_serving numeric(10,3) check (grams_per_serving > 0),
  calories_per_serving numeric(10,2) check (calories_per_serving >= 0),
  protein_g_per_serving numeric(10,2) check (protein_g_per_serving >= 0),
  carbs_g_per_serving numeric(10,2) check (carbs_g_per_serving >= 0),
  fat_g_per_serving numeric(10,2) check (fat_g_per_serving >= 0),
  calories_per_100g numeric(10,2) check (calories_per_100g >= 0),
  protein_g_per_100g numeric(10,2) check (protein_g_per_100g >= 0),
  carbs_g_per_100g numeric(10,2) check (carbs_g_per_100g >= 0),
  fat_g_per_100g numeric(10,2) check (fat_g_per_100g >= 0),
  source_type text not null default 'manual',
  external_source_name text,
  external_source_id text,
  last_synced_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table default_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  description text,
  instructions_json jsonb not null default '[]'::jsonb,
  notes text,
  default_servings integer not null check (default_servings > 0),
  prep_time_minutes integer check (prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes >= 0),
  default_meal_type meal_type,
  tags text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table default_recipe_ingredient_lines (
  id uuid primary key default gen_random_uuid(),
  default_recipe_id uuid not null references default_recipes(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  line_group text not null default 'main',
  position integer not null default 0,
  raw_text text,
  display_name text not null,
  quantity numeric(10,3) check (quantity > 0),
  unit text,
  grams_equivalent numeric(10,3) check (grams_equivalent > 0),
  grocery_category_override grocery_category,
  notes text,
  is_optional boolean not null default false,
  is_incomplete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  week_start_date date not null,
  title text,
  notes text,
  status meal_plan_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date),
  check (extract(isodow from week_start_date) = 1)
);

create table recipe_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  source_default_recipe_id uuid references default_recipes(id) on delete set null,
  version_name text not null,
  version_label text,
  description_snapshot text,
  instructions_snapshot_json jsonb not null default '[]'::jsonb,
  notes text,
  servings integer not null check (servings > 0),
  prep_time_minutes integer check (prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes >= 0),
  meal_type meal_type,
  nutrition_source nutrition_source_type not null default 'manual',
  total_calories numeric(10,2) check (total_calories >= 0),
  total_protein_g numeric(10,2) check (total_protein_g >= 0),
  total_carbs_g numeric(10,2) check (total_carbs_g >= 0),
  total_fat_g numeric(10,2) check (total_fat_g >= 0),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recipe_version_ingredient_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references recipe_versions(id) on delete cascade,
  default_recipe_ingredient_line_id uuid references default_recipe_ingredient_lines(id) on delete set null,
  ingredient_id uuid references ingredients(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  line_group text not null default 'main',
  position integer not null default 0,
  raw_text text,
  display_name text not null,
  quantity numeric(10,3) check (quantity > 0),
  unit text,
  grams_equivalent numeric(10,3) check (grams_equivalent > 0),
  calories numeric(10,2) check (calories >= 0),
  protein_g numeric(10,2) check (protein_g >= 0),
  carbs_g numeric(10,2) check (carbs_g >= 0),
  fat_g numeric(10,2) check (fat_g >= 0),
  grocery_category_override grocery_category,
  notes text,
  substitution_note text,
  is_optional boolean not null default false,
  is_incomplete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recipe_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  recipe_version_id uuid not null references recipe_versions(id) on delete cascade,
  batch_name text,
  box_count integer not null check (box_count > 0),
  made_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meal_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  recipe_batch_id uuid not null references recipe_batches(id) on delete cascade,
  parent_meal_box_id uuid references meal_boxes(id) on delete set null,
  box_number integer not null check (box_number > 0),
  title_snapshot text not null,
  base_portion_fraction numeric(8,3) not null default 1.0 check (base_portion_fraction > 0),
  available_fraction numeric(8,3) not null default 1.0 check (available_fraction >= 0),
  calories numeric(10,2) not null default 0 check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(10,2) not null default 0 check (fat_g >= 0),
  status meal_box_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_fraction <= base_portion_fraction),
  unique (recipe_batch_id, box_number)
);

create table standalone_food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  serving_amount numeric(10,3) not null default 1 check (serving_amount > 0),
  serving_unit text,
  calories numeric(10,2) not null default 0 check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(10,2) not null default 0 check (fat_g >= 0),
  ingredient_id uuid references ingredients(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  notes text,
  is_favorite boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meal_slot_entries (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  meal_type meal_type not null,
  sort_order integer not null default 0,
  entry_kind meal_entry_kind not null,
  meal_box_id uuid references meal_boxes(id) on delete restrict,
  standalone_food_item_id uuid references standalone_food_items(id) on delete set null,
  title_snapshot text not null,
  portion_fraction numeric(8,3) not null default 1.0 check (portion_fraction > 0),
  calories_snapshot numeric(10,2) not null default 0 check (calories_snapshot >= 0),
  protein_g_snapshot numeric(10,2) not null default 0 check (protein_g_snapshot >= 0),
  carbs_g_snapshot numeric(10,2) not null default 0 check (carbs_g_snapshot >= 0),
  fat_g_snapshot numeric(10,2) not null default 0 check (fat_g_snapshot >= 0),
  notes text,
  consumed_fraction numeric(8,3) check (consumed_fraction > 0),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (consumed_fraction is null or consumed_fraction <= portion_fraction),
  check (
    (entry_kind = 'meal_box' and meal_box_id is not null and standalone_food_item_id is null)
    or
    (entry_kind = 'standalone_food' and standalone_food_item_id is not null and meal_box_id is null)
  )
);

create table shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  meal_plan_id uuid not null unique references meal_plans(id) on delete cascade,
  basis shopping_list_basis not null default 'assigned_entries',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references shopping_lists(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  display_name text not null,
  grocery_category grocery_category,
  quantity numeric(12,3) check (quantity > 0),
  unit text,
  grams_equivalent numeric(12,3) check (grams_equivalent > 0),
  is_resolved boolean not null default true,
  is_manual_override boolean not null default false,
  is_checked boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table shopping_list_item_contributors (
  id uuid primary key default gen_random_uuid(),
  shopping_list_item_id uuid not null references shopping_list_items(id) on delete cascade,
  recipe_version_ingredient_line_id uuid references recipe_version_ingredient_lines(id) on delete set null,
  standalone_food_item_id uuid references standalone_food_items(id) on delete set null,
  display_name_snapshot text not null,
  quantity numeric(12,3) check (quantity > 0),
  unit text,
  grams_equivalent numeric(12,3) check (grams_equivalent > 0),
  created_at timestamptz not null default now(),
  check (
    recipe_version_ingredient_line_id is not null
    or standalone_food_item_id is not null
  )
);

create index idx_ingredients_user_name on ingredients(user_id, name);
create index idx_products_user_brand_name on products(user_id, brand_name, product_name);
create index idx_default_recipes_user_archived on default_recipes(user_id, archived_at);
create index idx_meal_plans_user_week on meal_plans(user_id, week_start_date);
create index idx_recipe_versions_meal_plan on recipe_versions(meal_plan_id);
create index idx_recipe_versions_user_created on recipe_versions(user_id, created_at desc);
create index idx_recipe_batches_recipe_version on recipe_batches(recipe_version_id, made_at desc);
create index idx_meal_boxes_batch_status on meal_boxes(recipe_batch_id, status);
create index idx_meal_slot_entries_plan_day_type on meal_slot_entries(meal_plan_id, day_of_week, meal_type, sort_order);
create index idx_shopping_list_items_list_category on shopping_list_items(shopping_list_id, grocery_category, display_name);

create trigger trg_app_users_updated_at
before update on app_users
for each row execute function set_updated_at();

create trigger trg_ingredients_updated_at
before update on ingredients
for each row execute function set_updated_at();

create trigger trg_ingredient_measure_conversions_updated_at
before update on ingredient_measure_conversions
for each row execute function set_updated_at();

create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

create trigger trg_default_recipes_updated_at
before update on default_recipes
for each row execute function set_updated_at();

create trigger trg_default_recipe_ingredient_lines_updated_at
before update on default_recipe_ingredient_lines
for each row execute function set_updated_at();

create trigger trg_meal_plans_updated_at
before update on meal_plans
for each row execute function set_updated_at();

create trigger trg_recipe_versions_updated_at
before update on recipe_versions
for each row execute function set_updated_at();

create trigger trg_recipe_version_ingredient_lines_updated_at
before update on recipe_version_ingredient_lines
for each row execute function set_updated_at();

create trigger trg_recipe_batches_updated_at
before update on recipe_batches
for each row execute function set_updated_at();

create trigger trg_meal_boxes_updated_at
before update on meal_boxes
for each row execute function set_updated_at();

create trigger trg_standalone_food_items_updated_at
before update on standalone_food_items
for each row execute function set_updated_at();

create trigger trg_meal_slot_entries_updated_at
before update on meal_slot_entries
for each row execute function set_updated_at();

create trigger trg_shopping_lists_updated_at
before update on shopping_lists
for each row execute function set_updated_at();

create trigger trg_shopping_list_items_updated_at
before update on shopping_list_items
for each row execute function set_updated_at();
