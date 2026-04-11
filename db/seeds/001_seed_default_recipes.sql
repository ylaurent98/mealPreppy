-- Deterministic development seed data for Mealpreppy.
-- This seed intentionally includes draft recipe lines where the original recipe
-- notes were incomplete. Those rows are marked with is_incomplete = true.

begin;

insert into app_users (
  id,
  email,
  display_name,
  timezone
)
values (
  '00000000-0000-0000-0000-000000000001',
  'demo@mealpreppy.local',
  'Mealpreppy Demo User',
  'Europe/Bucharest'
)
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  timezone = excluded.timezone;

insert into ingredients (
  id,
  user_id,
  name,
  normalized_name,
  category,
  default_grocery_category,
  source_type,
  notes
)
values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', 'Rolled Oats', 'rolled oats', 'grains', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000001', 'Cottage Cheese', 'cottage cheese', 'dairy', 'meat_dairy', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000001', 'Banana', 'banana', 'fruit', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000001', 'Milk', 'milk', 'dairy', 'meat_dairy', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000001', 'Egg', 'egg', 'protein', 'meat_dairy', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000001', 'Peanut Butter', 'peanut butter', 'spreads', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000001', 'Pistachios', 'pistachios', 'nuts', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000001', 'Raspberries', 'raspberries', 'fruit', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000001', 'Matcha', 'matcha', 'tea', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001010', '00000000-0000-0000-0000-000000000001', 'Maple Syrup', 'maple syrup', 'sweetener', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001011', '00000000-0000-0000-0000-000000000001', 'Chocolate Flakes', 'chocolate flakes', 'toppings', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001012', '00000000-0000-0000-0000-000000000001', 'Baking Powder', 'baking powder', 'baking', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001013', '00000000-0000-0000-0000-000000000001', 'Salt', 'salt', 'seasoning', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001014', '00000000-0000-0000-0000-000000000001', 'Pistachio Butter', 'pistachio butter', 'spreads', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001015', '00000000-0000-0000-0000-000000000001', 'Chicken Thighs', 'chicken thighs', 'protein', 'meat_dairy', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001016', '00000000-0000-0000-0000-000000000001', 'Black Pepper', 'black pepper', 'seasoning', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001017', '00000000-0000-0000-0000-000000000001', 'Garlic Paste', 'garlic paste', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001018', '00000000-0000-0000-0000-000000000001', 'Ginger Paste', 'ginger paste', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001019', '00000000-0000-0000-0000-000000000001', 'Soy Sauce', 'soy sauce', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001020', '00000000-0000-0000-0000-000000000001', 'Gochujang', 'gochujang', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001021', '00000000-0000-0000-0000-000000000001', 'Sriracha', 'sriracha', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001022', '00000000-0000-0000-0000-000000000001', 'Cucumber', 'cucumber', 'vegetable', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001023', '00000000-0000-0000-0000-000000000001', 'Garlic', 'garlic', 'vegetable', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001024', '00000000-0000-0000-0000-000000000001', 'Honey', 'honey', 'sweetener', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001025', '00000000-0000-0000-0000-000000000001', 'Rice Vinegar', 'rice vinegar', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001026', '00000000-0000-0000-0000-000000000001', 'Red Pepper Flakes', 'red pepper flakes', 'seasoning', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001027', '00000000-0000-0000-0000-000000000001', 'Salmon', 'salmon', 'protein', 'meat_dairy', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001028', '00000000-0000-0000-0000-000000000001', 'Edamame', 'edamame', 'legume', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001029', '00000000-0000-0000-0000-000000000001', 'Brown Rice', 'brown rice', 'grains', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001030', '00000000-0000-0000-0000-000000000001', 'Quinoa', 'quinoa', 'grains', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001031', '00000000-0000-0000-0000-000000000001', 'Lentils', 'lentils', 'legume', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001032', '00000000-0000-0000-0000-000000000001', 'Broccoli', 'broccoli', 'vegetable', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001033', '00000000-0000-0000-0000-000000000001', 'Sesame Seeds', 'sesame seeds', 'seeds', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001034', '00000000-0000-0000-0000-000000000001', 'Green Onion', 'green onion', 'vegetable', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001035', '00000000-0000-0000-0000-000000000001', 'Pickled Beetroot', 'pickled beetroot', 'vegetable', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001036', '00000000-0000-0000-0000-000000000001', 'Tahini', 'tahini', 'paste', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001037', '00000000-0000-0000-0000-000000000001', 'Water', 'water', 'liquid', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001038', '00000000-0000-0000-0000-000000000001', 'Apple Cider Vinegar', 'apple cider vinegar', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001039', '00000000-0000-0000-0000-000000000001', 'Sesame Oil', 'sesame oil', 'oil', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001040', '00000000-0000-0000-0000-000000000001', 'Cornstarch', 'cornstarch', 'baking', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001041', '00000000-0000-0000-0000-000000000001', 'Low-Sodium Soy Sauce', 'low sodium soy sauce', 'condiment', 'pantry', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.'),
  ('00000000-0000-0000-0000-000000001042', '00000000-0000-0000-0000-000000000001', 'Ginger', 'ginger', 'vegetable', 'fruit_veg', 'manual_seed', 'Draft seed ingredient. Nutrition can be filled later.')
on conflict (id) do update
set
  user_id = excluded.user_id,
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  category = excluded.category,
  default_grocery_category = excluded.default_grocery_category,
  source_type = excluded.source_type,
  notes = excluded.notes;

insert into ingredient_measure_conversions (
  id,
  ingredient_id,
  unit,
  amount,
  grams_equivalent,
  notes
)
values
  ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000001002', 'tbsp', 1, 15, 'Approximate cottage cheese conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000001004', 'cup', 1, 240, 'Approximate milk conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000001001', 'cup', 1, 80, 'Approximate rolled oats conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000001006', 'tbsp', 1, 16, 'Approximate peanut butter conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000001007', 'tbsp', 1, 8, 'Approximate pistachio conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000001008', 'cup', 1, 120, 'Approximate raspberry conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000001009', 'tsp', 1, 2, 'Approximate matcha conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000001010', 'tsp', 1, 6, 'Approximate maple syrup conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002009', '00000000-0000-0000-0000-000000001033', 'tsp', 1, 3, 'Approximate sesame seed conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002010', '00000000-0000-0000-0000-000000001029', 'cup', 1, 185, 'Approximate cooked brown rice conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002011', '00000000-0000-0000-0000-000000001030', 'cup', 1, 185, 'Approximate cooked quinoa conversion for draft seed data.'),
  ('00000000-0000-0000-0000-000000002012', '00000000-0000-0000-0000-000000001036', 'tbsp', 1, 15, 'Approximate tahini conversion for draft seed data.')
on conflict (id) do update
set
  ingredient_id = excluded.ingredient_id,
  unit = excluded.unit,
  amount = excluded.amount,
  grams_equivalent = excluded.grams_equivalent,
  notes = excluded.notes;

insert into products (
  id,
  user_id,
  ingredient_id,
  brand_name,
  product_name,
  serving_size_amount,
  serving_size_unit,
  calories_per_serving,
  source_type,
  notes
)
values (
  '00000000-0000-0000-0000-000000003001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000001009',
  'Draft Brand',
  'Matcha Latte Pouch',
  1,
  'pouch',
  47,
  'manual_seed',
  'Derived from user note: 2 pouches = 94 calories.'
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  ingredient_id = excluded.ingredient_id,
  brand_name = excluded.brand_name,
  product_name = excluded.product_name,
  serving_size_amount = excluded.serving_size_amount,
  serving_size_unit = excluded.serving_size_unit,
  calories_per_serving = excluded.calories_per_serving,
  source_type = excluded.source_type,
  notes = excluded.notes;

insert into default_recipes (
  id,
  user_id,
  name,
  description,
  instructions_json,
  notes,
  default_servings,
  cook_time_minutes,
  default_meal_type,
  tags
)
values
  (
    '00000000-0000-0000-0000-000000004001',
    '00000000-0000-0000-0000-000000000001',
    'Matcha Baked Oatmeal',
    'Baked oatmeal breakfast with matcha, fruit, and pistachio topping.',
    '["Blend wet ingredients, stir through oats and flavorings, bake until set, then finish with topping."]'::jsonb,
    'Draft seed from user notes. Approximate manual nutrition: 408 calories and about 15g protein per serving. Confirm whether topping is included in those macros.',
    4,
    30,
    'breakfast',
    array['breakfast', 'meal-prep', 'oatmeal']
  ),
  (
    '00000000-0000-0000-0000-000000004002',
    '00000000-0000-0000-0000-000000000001',
    'Korean BBQ Thighs',
    'Korean-style chicken thighs with spicy cucumber side.',
    '["Marinate chicken thighs, prep cucumber side, then air fry or oven cook at 200C for 16 to 18 minutes."]'::jsonb,
    'Draft seed from user notes. Chicken amount, cucumber amount, servings, and macros still need confirmation.',
    4,
    18,
    'dinner',
    array['lunch', 'dinner', 'meal-prep', 'korean']
  ),
  (
    '00000000-0000-0000-0000-000000004003',
    '00000000-0000-0000-0000-000000000001',
    'Teriyaki Salmon',
    'Salmon meal prep with grains, lentils, broccoli, and beetroot tahini dressing.',
    '["Cook salmon and vegetables, prepare grains and lentils, whisk dressing and glaze, then portion into meal-prep boxes."]'::jsonb,
    'Draft seed from user notes. Servings inferred from 125g salmon per serving = 500g total. Confirm whether rice, quinoa, lentils, and edamame are total amounts or per-serving amounts.',
    4,
    25,
    'dinner',
    array['lunch', 'dinner', 'meal-prep', 'salmon']
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  name = excluded.name,
  description = excluded.description,
  instructions_json = excluded.instructions_json,
  notes = excluded.notes,
  default_servings = excluded.default_servings,
  cook_time_minutes = excluded.cook_time_minutes,
  default_meal_type = excluded.default_meal_type,
  tags = excluded.tags;

insert into default_recipe_ingredient_lines (
  id,
  default_recipe_id,
  ingredient_id,
  product_id,
  line_group,
  position,
  raw_text,
  display_name,
  quantity,
  unit,
  grocery_category_override,
  notes,
  is_optional,
  is_incomplete
)
values
  ('00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001002', null, 'main', 1, '4 tbsp cottage cheese', 'Cottage Cheese', 4, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001003', null, 'main', 2, '2 banana', 'Banana', 2, 'unit', null, null, false, false),
  ('00000000-0000-0000-0000-000000005003', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001004', null, 'main', 3, '1 cup milk', 'Milk', 1, 'cup', null, null, false, false),
  ('00000000-0000-0000-0000-000000005004', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001005', null, 'main', 4, '1 egg', 'Egg', 1, 'unit', null, null, false, false),
  ('00000000-0000-0000-0000-000000005005', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001001', null, 'main', 5, '1 1/3 cup rolled oats', 'Rolled Oats', 1.333, 'cup', null, null, false, false),
  ('00000000-0000-0000-0000-000000005006', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001006', null, 'main', 6, '1 tbsp peanut butter', 'Peanut Butter', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005007', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001007', null, 'main', 7, '1 pistachio', 'Pistachios', 1, 'unit', null, 'Seeded exactly as written. Confirm whether this should remain a single pistachio.', false, true),
  ('00000000-0000-0000-0000-000000005008', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001007', null, 'main', 8, '2 tbsp pistachios', 'Pistachios', 2, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005009', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001008', null, 'main', 9, '1 cup raspberries', 'Raspberries', 1, 'cup', null, null, false, false),
  ('00000000-0000-0000-0000-000000005010', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001009', null, 'main', 10, '4 tsp matcha', 'Matcha', 4, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005011', '00000000-0000-0000-0000-000000004001', null, '00000000-0000-0000-0000-000000003001', 'main', 11, '2 matcha latte pouches (94 cal)', 'Matcha Latte Pouch', 2, 'pouch', 'pantry', 'Seeded as product-level branded item from user note.', false, false),
  ('00000000-0000-0000-0000-000000005012', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001010', null, 'main', 12, '2 tsp maple syrup', 'Maple Syrup', 2, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005013', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001011', null, 'main', 13, '4 tsp chocolate flakes', 'Chocolate Flakes', 4, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005014', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001012', null, 'main', 14, '1 tsp baking powder', 'Baking Powder', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005015', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001013', null, 'main', 15, 'Pinch salt', 'Salt', 1, 'pinch', null, null, false, false),
  ('00000000-0000-0000-0000-000000005016', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001014', null, 'topping', 16, '1 tbsp pistachio butter', 'Pistachio Butter', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005017', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001010', null, 'topping', 17, '2 tsp maple syrup', 'Maple Syrup', 2, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005018', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000001007', null, 'topping', 18, '1 tbsp pistachios', 'Pistachios', 1, 'tbsp', null, null, false, false),

  ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001015', null, 'thighs', 1, 'Chicken thighs - quantity not yet provided', 'Chicken Thighs', null, null, null, 'Draft recipe line kept incomplete until quantity is confirmed.', false, true),
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001016', null, 'thighs', 2, '1 tbsp black pepper', 'Black Pepper', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001017', null, 'thighs', 3, '1 tbsp garlic paste', 'Garlic Paste', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005104', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001018', null, 'thighs', 4, '1 tbsp ginger paste', 'Ginger Paste', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005105', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001019', null, 'thighs', 5, '25 ml soy sauce', 'Soy Sauce', 25, 'ml', null, null, false, false),
  ('00000000-0000-0000-0000-000000005106', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001020', null, 'thighs', 6, '1 tbsp gochujang', 'Gochujang', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005107', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001021', null, 'thighs', 7, 'sriracha squeeeeze', 'Sriracha', null, null, null, 'Seeded exactly as written. Quantity still needs confirmation.', false, true),
  ('00000000-0000-0000-0000-000000005108', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001033', null, 'thighs', 8, '1 tbsp sesame seeds', 'Sesame Seeds', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005109', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001022', null, 'cucumbers', 9, 'Cucumber - quantity not yet provided', 'Cucumber', null, null, null, 'Draft recipe line kept incomplete until quantity is confirmed.', false, true),
  ('00000000-0000-0000-0000-000000005110', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001013', null, 'cucumbers', 10, '1 tsp salt', 'Salt', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005111', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001023', null, 'cucumbers', 11, '1 tsp fresh garlic', 'Garlic', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005112', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001020', null, 'cucumbers', 12, '1 tbsp gochujang', 'Gochujang', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005113', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001024', null, 'cucumbers', 13, '1 tsp honey', 'Honey', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005114', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001025', null, 'cucumbers', 14, '30 ml rice vinegar', 'Rice Vinegar', 30, 'ml', null, null, false, false),
  ('00000000-0000-0000-0000-000000005115', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001026', null, 'cucumbers', 15, '1 tsp red pepper flakes', 'Red Pepper Flakes', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005116', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001019', null, 'cucumbers', 16, '25 ml light soy sauce', 'Soy Sauce', 25, 'ml', null, 'Stored against soy sauce ingredient for now. Split into separate branded/light product later if needed.', false, false),
  ('00000000-0000-0000-0000-000000005117', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000001033', null, 'cucumbers', 17, '1 tbsp sesame seeds', 'Sesame Seeds', 1, 'tbsp', null, null, false, false),

  ('00000000-0000-0000-0000-000000005201', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001028', null, 'main', 1, 'Edamame 77g', 'Edamame', 77, 'g', null, 'Needs confirmation whether this is total or per serving.', false, true),
  ('00000000-0000-0000-0000-000000005202', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001027', null, 'main', 2, 'Salmon 125 g/serving = 500g total', 'Salmon', 500, 'g', null, null, false, false),
  ('00000000-0000-0000-0000-000000005203', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001029', null, 'main', 3, 'Brown rice 1/4 cup', 'Brown Rice', 0.25, 'cup', null, 'Needs confirmation whether this is total or per serving.', false, true),
  ('00000000-0000-0000-0000-000000005204', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001030', null, 'main', 4, 'Quinoa 1/4 cup', 'Quinoa', 0.25, 'cup', null, 'Needs confirmation whether this is total or per serving.', false, true),
  ('00000000-0000-0000-0000-000000005205', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001031', null, 'main', 5, 'Lentils 1/2 can', 'Lentils', 0.5, 'can', null, 'Needs confirmation whether this is total or per serving.', false, true),
  ('00000000-0000-0000-0000-000000005206', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001032', null, 'main', 6, 'Broccoli 300g', 'Broccoli', 300, 'g', null, null, false, false),
  ('00000000-0000-0000-0000-000000005207', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001033', null, 'main', 7, 'Top with 1 tsp sesame seeds', 'Sesame Seeds', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005208', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001034', null, 'main', 8, '1 green onion', 'Green Onion', 1, 'unit', null, null, false, false),
  ('00000000-0000-0000-0000-000000005209', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001035', null, 'beetroot_tahini_dressing', 9, '1 pickled beetroot', 'Pickled Beetroot', 1, 'unit', null, 'User note: dressing stated as 130 calories total.', false, false),
  ('00000000-0000-0000-0000-000000005210', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001036', null, 'beetroot_tahini_dressing', 10, '1 tbsp tahini', 'Tahini', 1, 'tbsp', null, 'User note: dressing stated as 130 calories total.', false, false),
  ('00000000-0000-0000-0000-000000005211', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001037', null, 'beetroot_tahini_dressing', 11, '1/8 cup room temperature water', 'Water', 0.125, 'cup', null, null, false, false),
  ('00000000-0000-0000-0000-000000005212', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001038', null, 'beetroot_tahini_dressing', 12, '1 tsp apple cider vinegar', 'Apple Cider Vinegar', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005213', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001010', null, 'beetroot_tahini_dressing', 13, '1/2 tsp maple syrup', 'Maple Syrup', 0.5, 'tsp', null, 'User note: 8 calories.', false, false),
  ('00000000-0000-0000-0000-000000005214', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001041', null, 'teriyaki_glaze', 14, '1/4 cup low-sodium soy sauce', 'Low-Sodium Soy Sauce', 0.25, 'cup', null, 'User note: teriyaki glaze stated as 90 calories without honey, 150 with honey.', false, false),
  ('00000000-0000-0000-0000-000000005215', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001024', null, 'teriyaki_glaze', 15, '1 tbsp honey', 'Honey', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005216', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001025', null, 'teriyaki_glaze', 16, '1 tbsp rice vinegar', 'Rice Vinegar', 1, 'tbsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005217', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001039', null, 'teriyaki_glaze', 17, '1 tsp sesame oil', 'Sesame Oil', 1, 'tsp', null, null, false, false),
  ('00000000-0000-0000-0000-000000005218', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001040', null, 'teriyaki_glaze', 18, '1 tsp cornstarch', 'Cornstarch', 1, 'tsp', null, 'Optional in original note.', true, false),
  ('00000000-0000-0000-0000-000000005219', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001023', null, 'teriyaki_glaze', 19, 'Garlic & ginger - negligible', 'Garlic', null, null, null, 'Original note did not specify garlic quantity.', false, true),
  ('00000000-0000-0000-0000-000000005220', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000001042', null, 'teriyaki_glaze', 20, 'Garlic & ginger - negligible', 'Ginger', null, null, null, 'Original note did not specify ginger quantity.', false, true)
on conflict (id) do update
set
  default_recipe_id = excluded.default_recipe_id,
  ingredient_id = excluded.ingredient_id,
  product_id = excluded.product_id,
  line_group = excluded.line_group,
  position = excluded.position,
  raw_text = excluded.raw_text,
  display_name = excluded.display_name,
  quantity = excluded.quantity,
  unit = excluded.unit,
  grocery_category_override = excluded.grocery_category_override,
  notes = excluded.notes,
  is_optional = excluded.is_optional,
  is_incomplete = excluded.is_incomplete;

commit;
