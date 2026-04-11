# Mealpreppy Product Specification

## Vision

Mealpreppy helps users plan meals week by week, turn recipes into portioned meal boxes, place those boxes into a weekly meal calendar, and track calories/macros over time.

The product is designed around a key real-world behavior:

- recipes evolve over time
- ingredients and branded products change
- a user may prep a recipe differently each week
- the weekly plan should preserve what was actually planned and consumed for that specific week

## Core Product Principles

- Weekly plans are historical records and should not change when the master recipe changes later.
- Recipes should support versioning so each week can use a dated snapshot.
- A "made" recipe becomes a set of individual meal boxes that can be scheduled independently.
- Nutrition should work at both recipe level and box level.
- Users must be able to override data manually at any point.
- The UI should eventually support a highly customized and expressive visual design.

## Primary User Stories

### Recipe Creation

- As a user, I can create recipes manually.
- As a user, I can define ingredients, amounts, units, portions, and instructions.
- As a user, I can manually enter macros/calories for a recipe initially.
- As a user, I can later fetch updated product nutrition from a third-party source and apply it.

### Recipe Versioning

- As a user, I can use a default recipe as a template.
- As a user, I can create a dated version of a recipe for a specific week.
- As a user, I can modify that weekly version without changing the original default recipe.
- As a user, I can scale portions, swap ingredients, change brands, or adjust nutrition values for that weekly version.

### Meal Prep / Box Generation

- As a user, I can press a `Make` button on a recipe version.
- As a user, if a recipe has 6 portions, the app creates 6 meal boxes.
- As a user, each meal box shows calories and macros.
- As a user, I can drag meal boxes onto breakfast, lunch, dinner, or snack slots in the weekly planner.
- As a user, I can resize a meal box to represent a partial portion such as 0.5.

### Weekly Planning

- As a user, I can view a week grid with days as columns and meal slots as rows.
- As a user, I can place prepared boxes into the weekly plan.
- As a user, I can add snack items that are not tied to a recipe.
- As a user, I can see daily totals and weekly total calories/macros.

### Shopping List

- As a user, I can generate a shopping list for the full week from all planned recipes and snacks.
- As a user, duplicate ingredients are merged into a single shopping list line where possible.
- As a user, the shopping list is grouped into `Pantry`, `Fruit/Veg`, and `Meat/Dairy`.
- As a user, I can manually edit shopping list lines when automatic grouping or merging is imperfect.

### History and Insights

- As a user, I can browse past meal plans in a calendar/history view.
- As a user, I can review average calories consumed over time.
- As a user, I can compare planned vs consumed values in future versions.

### Accounts and Sync

- As a user, I can create an account and sign in.
- As a user, my recipes, plans, boxes, and history are stored securely.
- As a user, I can access my meal plans across devices.

## Domain Model

### Core Entities

1. Default Recipe
   A reusable base recipe template.

2. Recipe Version
   A dated snapshot of a default recipe for a particular planning week.

3. Ingredient
   A food item with nutritional values and unit conversion support.

4. Product / Brand Variant
   A branded instance of an ingredient or packaged food with brand-specific nutrition.

5. Recipe Ingredient Line
   A line inside a recipe version that references an ingredient or product with amount/unit.

6. Meal Box
   A single produced portion created from a recipe version after pressing `Make`.

7. Weekly Meal Plan
   A dated weekly schedule containing assigned meal boxes and extra snack items.

8. Meal Slot Entry
   A placement of a meal box or snack item into a specific day/meal slot.

9. Snack / Extra Item
   A standalone consumable not generated from a recipe.

10. Shopping List
    A generated grocery list for a specific week.

11. Shopping List Item
    A categorized ingredient line inside a shopping list.

12. User
    The account owner for all data.

## Key Behavior Rules

### Recipe and Version Rules

- A default recipe is never directly scheduled into the week.
- A default recipe must be converted into a recipe version before planning.
- Each recipe version is linked to a planning week start date.
- Editing a recipe version does not mutate the default recipe.
- A user may create multiple versions from the same default recipe across different weeks.

### Nutrition Rules

- Recipe nutrition can be stored manually at first.
- Nutrition may later be recalculated from ingredient/product data.
- Product-level nutrition should override generic ingredient nutrition when a brand-specific item is chosen.
- Meal box nutrition is derived from the recipe version nutrition divided by effective portions.
- If a box is scaled to 0.5, displayed calories/macros should also scale to 50%.

### Planning Rules

- Pressing `Make` creates discrete meal boxes tied to a recipe version.
- Meal boxes should remain linked to the originating recipe version for traceability.
- Each meal box can exist in an "unassigned" pool until dragged into a meal slot.
- A box can only be assigned once unless explicitly duplicated.
- Snack items can be created independently and assigned directly to snack slots.

### Shopping List Rules

- A shopping list is generated from the recipes, recipe versions, and standalone snack items included in a given week.
- Ingredient totals should be aggregated across all included meals for that week.
- Aggregation should prefer canonical ingredient identity plus unit normalization where possible.
- If ingredients cannot be safely merged because units or products differ, they should remain as separate lines for user review.
- Each shopping list item must belong to one primary grocery category.
- Users must be able to override the category manually.

### History Rules

- Weekly meal plans must be immutable snapshots for historical accuracy, except where the user explicitly edits them.
- Historical weeks must preserve the exact recipe version and nutrition used at that time.
- Calendar/history view should allow browsing by week and day.

## Functional Requirements

### 1. Recipe Management

- Create, edit, archive default recipes.
- Store name, description, instructions, tags, cuisine, prep time, cook time.
- Store default portion count.
- Store ingredients with quantity and unit.
- Support manual recipe-level macros:
  - calories
  - protein
  - carbs
  - fat
- Support optional future micronutrients.

### 2. Recipe Versioning

- Create recipe version from default recipe.
- Assign version to a week start date.
- Copy ingredients and instructions into version snapshot.
- Allow editing:
  - portion count
  - ingredient substitutions
  - brand substitutions
  - manual nutrition overrides
  - notes for that week
- Show provenance:
  - created from recipe X
  - version date/week
  - last updated timestamp

### 3. Third-Party Nutrition Integration

Initial phase:

- manual nutrition entry only

Future phase:

- search external nutrition/product provider
- retrieve branded product nutrition
- map results to ingredient/product entries
- user confirms imported values before saving
- store source metadata and last sync timestamp

Good integration candidates to evaluate later:

- USDA FoodData Central for generic foods
- branded food databases/APIs
- grocery or barcode APIs

### 4. Meal Box Generation

- `Make` button on recipe version creates N meal boxes where N = portion count.
- Each box stores:
  - originating recipe version
  - fraction of portion (default 1.0)
  - calories
  - protein
  - carbs
  - fat
  - status (unassigned, assigned, consumed, deleted)
- Boxes should be individually draggable.
- User can scale a box:
  - 1.0
  - 0.5
  - 0.25
  - custom fraction

### 5. Weekly Meal Planner

Week view layout:

- columns: Monday to Sunday
- rows:
  - breakfast
  - lunch
  - dinner
  - snack

Capabilities:

- drag meal boxes into any slot
- drag between slots
- remove from slot back to pool
- add standalone snack entries
- show slot totals
- show day totals
- show weekly totals at bottom

### 6. Snack / Standalone Entries

- Create custom snack items not tied to recipes.
- Manual nutrition entry for snacks.
- Optional link to ingredient/product database.
- Snacks can be added directly into snack row or other meal rows if needed later.

### 7. Calendar and History

- Calendar month view with indicators for weeks containing meal plans.
- Open any saved week from calendar.
- Show weekly summary:
  - total planned calories
  - total consumed calories
  - macro averages
- Preserve historical recipe versions used in that week.

### 8. Weekly Shopping List

- Generate shopping list from a weekly meal plan.
- Include ingredients from all recipe versions used that week.
- Include standalone snack items where those snacks reference ingredients/products.
- Group items into:
  - pantry
  - fruit/veg
  - meat/dairy
- Merge repeated ingredients where possible.
- Show unresolved lines separately if units/products conflict.
- Allow manual edits:
  - rename item
  - change quantity
  - change unit
  - move category
  - check off purchased state in future

### 9. Stats and Analytics

Initial stats:

- average calories consumed per day
- average calories planned per day
- weekly calorie totals
- average protein/carbs/fat consumed

Future stats:

- adherence rate (planned vs consumed)
- trend charts over time
- meal type breakdown
- recipe usage frequency

### 10. Authentication and Accounts

Future requirement:

- email/password auth
- password reset
- session management
- private user data isolation
- cloud sync/backups

## Suggested Information Architecture

### Main Areas

1. Dashboard
2. Recipes
3. Weekly Prep
4. Calendar
5. Stats
6. Settings / Account

### Weekly Prep Screen

Recommended subareas:

- left panel: recipe versions to prep + unassigned meal boxes
- main grid: weekly planner
- bottom summary: total weekly calories/macros
- optional right panel: details/editor for selected box or slot
- shopping list drawer or tab for weekly generated groceries

## Data Model Draft

### users

- id
- email
- password_hash
- created_at
- updated_at

### default_recipes

- id
- user_id
- name
- description
- instructions_json
- default_portions
- tags_json
- created_at
- updated_at
- archived_at

### recipe_versions

- id
- user_id
- default_recipe_id
- week_start_date
- version_label
- notes
- portions
- nutrition_source_type
- manual_calories
- manual_protein_g
- manual_carbs_g
- manual_fat_g
- created_at
- updated_at

### recipe_version_ingredients

- id
- recipe_version_id
- ingredient_id nullable
- product_id nullable
- display_name
- quantity
- unit
- grams_equivalent nullable
- calories
- protein_g
- carbs_g
- fat_g
- position

### ingredients

- id
- user_id nullable
- name
- category
- grocery_category
- density_g_per_ml nullable
- grams_per_cup nullable
- grams_per_tbsp nullable
- grams_per_tsp nullable
- calories_per_100g
- protein_g_per_100g
- carbs_g_per_100g
- fat_g_per_100g
- source_type
- created_at
- updated_at

### products

- id
- ingredient_id nullable
- brand_name
- product_name
- serving_size_value nullable
- serving_size_unit nullable
- grams_per_serving nullable
- calories_per_serving nullable
- protein_g_per_serving nullable
- carbs_g_per_serving nullable
- fat_g_per_serving nullable
- calories_per_100g nullable
- protein_g_per_100g nullable
- carbs_g_per_100g nullable
- fat_g_per_100g nullable
- external_source_name nullable
- external_source_id nullable
- last_synced_at nullable
- created_at
- updated_at

### meal_plans

- id
- user_id
- week_start_date
- title nullable
- created_at
- updated_at

### meal_boxes

- id
- user_id
- recipe_version_id
- meal_plan_id nullable
- box_index
- portion_fraction
- calories
- protein_g
- carbs_g
- fat_g
- status
- created_at
- updated_at

### snack_items

- id
- user_id
- name
- calories
- protein_g
- carbs_g
- fat_g
- ingredient_id nullable
- product_id nullable
- created_at
- updated_at

### meal_slot_entries

- id
- meal_plan_id
- day_of_week
- meal_type
- meal_box_id nullable
- snack_item_id nullable
- sort_order
- consumed_fraction nullable
- consumed_at nullable
- created_at
- updated_at

### shopping_lists

- id
- user_id
- meal_plan_id
- week_start_date
- generated_at
- updated_at

### shopping_list_items

- id
- shopping_list_id
- ingredient_id nullable
- product_id nullable
- display_name
- grocery_category
- quantity
- unit
- grams_equivalent nullable
- aggregation_key nullable
- is_manual_override
- is_checked
- created_at
- updated_at

## Unit Conversion Requirements

The ingredient database should support both weight-based and volume-based entry.

Required support:

- grams
- kilograms
- milliliters
- liters
- cups
- tablespoons
- teaspoons
- units/pieces where relevant

Conversion approach:

- store nutrition canonically per 100g
- convert volume units to grams using density or unit-specific gram mappings
- allow manual override for ingredient-specific conversions
- allow product-specific serving conversions where packaging defines serving size

Important note:

- cup/tbsp/tsp conversions are ingredient-dependent and must not be treated as universal

## Recommended MVP Scope

### In Scope for MVP

- manual recipe creation
- default recipes
- dated recipe versions by week
- manual macro entry
- `Make` into meal boxes
- drag boxes into weekly planner
- standalone snack items
- partial portion scaling
- weekly calorie/macro totals
- weekly shopping list generation grouped by grocery section
- saved weekly history
- basic calendar view
- basic average calorie stats

### Out of Scope for MVP

- automatic nutrition import
- barcode scanning
- collaborative households
- advanced charts
- full micronutrient tracking
- public recipe sharing

## Suggested Release Phases

### Phase 1: Core Planning

- default recipes
- recipe versions
- manual macros
- make meal boxes
- weekly planner
- snack items
- shopping list generation
- history/calendar

### Phase 2: Smarter Nutrition

- ingredient database improvements
- product/brand variants
- nutrition recalculation engine
- external nutrition search/import

### Phase 3: Accounts and Sync

- auth
- cloud persistence
- multi-device access

### Phase 4: Premium Experience

- highly customized funky UI
- advanced analytics
- habit insights
- better visual calendar and trends

## UX Notes for the Future Custom UI

- The app should feel playful and highly visual, not like a spreadsheet.
- Meal boxes should look tangible, like draggable prep containers.
- Nutrition badges should be readable at a glance.
- The weekly grid should prioritize fast drag-and-drop planning.
- The shopping list should feel quick to scan in a grocery store, with strong category separation.
- Historical calendar should feel visual and rewarding to browse.
- Design system should support bold typography, strong color identity, and custom motion.

## Open Product Decisions

These should be decided before implementation starts in earnest:

1. Should the app track only planned food, or also actual consumed food?
2. Can the same meal box be split across multiple days, or should splitting create a new derived box?
3. Should boxes be editable after assignment, or only before assignment?
4. Should snacks be allowed in breakfast/lunch/dinner too, or only snack row?
5. Should nutrition display per box, per slot, per day, and per week all at once?
6. What level of detail should the calendar show without opening a week?
7. Which auth provider should be used later?
8. Which nutrition source should be prioritized for integration first?
9. Should shopping list generation use all recipes prepared that week, or only foods actually assigned into weekly slots?
10. Should pantry staples be optionally excluded if the user marks them as always stocked?

## Recommended Technical Direction

For a flexible, highly customized product, a good starting stack would be:

- Frontend: React + TypeScript + a custom design system
- Backend: Supabase or a custom API
- Database: PostgreSQL
- Drag and drop: a modern React drag-and-drop library
- Charts/calendar: custom components or selectively chosen libraries

This keeps the app customizable enough for the stronger UI direction you want later.

## Next Best Deliverables

After this spec, the next useful documents would be:

1. screen-by-screen wireframe/spec
2. database schema in SQL
3. MVP feature checklist
4. user flows for recipe versioning and box planning
5. API contract draft
