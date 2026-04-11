# Seed Recipes Draft

This file captures the first default recipes to seed into the app.

It is intentionally a draft:

- some recipes have incomplete quantities
- some macros are approximate
- some serving counts still need confirmation

These recipes are still valuable now because they help shape the schema, shopping-list logic, and weekly meal prep workflow.

## Recipe 1: Matcha Baked Oatmeal

### Base Metadata

- default recipe name: Matcha Baked Oatmeal
- default servings: 4
- meal type: breakfast
- calories per serving: 408
- protein per serving: approximately 15g
- macro source: manual

### Ingredients

- cottage cheese, 4 tbsp
- banana, 2
- milk, 1 cup
- egg, 1
- rolled oats, 1 1/3 cup
- peanut butter, 1 tbsp
- pistachio, 1 unit
- pistachios, 2 tbsp
- raspberries, 1 cup
- matcha, 4 tsp
- matcha latte pouches, 2 pouches, note: user included `94 cal`
- maple syrup, 2 tsp
- chocolate flakes, 4 tsp
- baking powder, 1 tsp
- salt, pinch

### Topping

- pistachio butter, 1 tbsp
- maple syrup, 2 tsp
- pistachios, 1 tbsp

### Shopping List Category Hints

- Pantry:
  - rolled oats
  - peanut butter
  - pistachios
  - matcha
  - matcha latte pouches
  - maple syrup
  - chocolate flakes
  - baking powder
  - salt
  - pistachio butter
- Fruit/Veg:
  - banana
  - raspberries
- Meat/Dairy:
  - cottage cheese
  - milk
  - egg

### Notes / Open Questions

- Confirm whether `1 pistachio` under the main recipe is intentional or shorthand for something else.
- Confirm whether topping is included in the stated `408 calories per serving`.
- Decide whether `matcha latte pouches` should be stored as a branded product instead of a generic ingredient.

## Recipe 2: Korean BBQ Thighs

### Base Metadata

- default recipe name: Korean BBQ Thighs
- default servings: unknown
- meal type: lunch or dinner
- macro source: manual later

### Main Protein Marinade

- chicken thighs, quantity not yet provided
- black pepper, 1 tbsp
- garlic paste, 1 tbsp
- ginger paste, 1 tbsp
- soy sauce, 25 ml
- gochujang, 1 tbsp
- sriracha, quantity not yet provided
- sesame seeds, 1 tbsp

### Cucumber Side

- cucumber, quantity not yet provided
- salt, 1 tsp
- fresh garlic, 1 tsp
- gochujang, 1 tbsp
- honey, 1 tsp
- rice vinegar, 30 ml
- red pepper flakes, 1 tsp
- light soy sauce, 25 ml
- sesame seeds, 1 tbsp

### Cooking Notes

- cook method: air fryer or oven
- cook time: 16 to 18 minutes
- temperature: 200 C

### Shopping List Category Hints

- Pantry:
  - black pepper
  - garlic paste
  - ginger paste
  - soy sauce
  - gochujang
  - sriracha
  - sesame seeds
  - salt
  - honey
  - rice vinegar
  - red pepper flakes
  - light soy sauce
- Fruit/Veg:
  - cucumber
  - fresh garlic
- Meat/Dairy:
  - chicken thighs

### Notes / Open Questions

- Need chicken thigh quantity.
- Need cucumber quantity.
- Need serving count.
- Need calories/macros.
- Need confirmation on whether this is usually paired with rice or another starch.

## Recipe 3: Teriyaki Salmon

### Base Metadata

- default recipe name: Teriyaki Salmon
- inferred servings: 4
- inference basis: `125 g salmon per serving = 500 g total`
- meal type: lunch or dinner
- macro source: mixed manual

### Main Ingredients

- salmon, 500 g total
- edamame, 77 g
- brown rice, 1/4 cup
- quinoa, 1/4 cup
- lentils, 1/2 can
- broccoli, 300 g
- sesame seeds, 1 tsp
- green onion, 1

### Beetroot Tahini Dressing

- pickled beetroot, 1
- tahini, 1 tbsp
- water, 1/8 cup
- apple cider vinegar, 1 tsp
- maple syrup, 1/2 tsp
- stated calories: 130

### Teriyaki Glaze

- low-sodium soy sauce, 1/4 cup
- honey, 1 tbsp
- rice vinegar, 1 tbsp
- sesame oil, 1 tsp
- cornstarch, 1 tsp
- garlic, unspecified quantity
- ginger, unspecified quantity
- stated calories: 90 without honey, 150 with honey

### Shopping List Category Hints

- Pantry:
  - brown rice
  - quinoa
  - lentils
  - sesame seeds
  - tahini
  - apple cider vinegar
  - maple syrup
  - low-sodium soy sauce
  - honey
  - rice vinegar
  - sesame oil
  - cornstarch
- Fruit/Veg:
  - broccoli
  - green onion
  - pickled beetroot
  - garlic
  - ginger
  - edamame
- Meat/Dairy:
  - salmon

### Notes / Open Questions

- Confirm whether `77 g edamame` is total recipe quantity or per serving.
- Confirm whether `1/4 cup brown rice` and `1/4 cup quinoa` are totals or per serving.
- Confirm whether `1/2 can lentils` is total recipe quantity or per serving.
- Need total recipe calories/macros or final per-serving macros.

## Shopping List Specification Notes From These Recipes

These recipes highlight a few practical product requirements:

- branded pantry items must be supported, for example matcha latte pouches
- ingredient lines may include vague entries such as `sriracha squeeze`, so drafts should allow incomplete quantities
- the system should preserve user text exactly even before normalization
- shopping list generation should support unresolved items that need manual cleanup
- grocery categories should default from ingredient data but remain editable

## Suggested Seed Data Behavior

When these recipes are first entered into the app:

- store them as default recipes
- mark incomplete ingredient lines as draft/incomplete
- keep macro values manual
- allow recipe versions to override quantities each week
- allow the shopping list to include flagged items for unresolved quantities
