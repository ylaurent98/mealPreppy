import type {
  AppState,
  ExtraFood,
  IngredientRecord,
  IngredientLine,
  MealBox,
  Nutrition,
  PlannerEntry,
  RecipeTemplate,
  RecipeVersion,
  WeekPlan,
} from './types'
import { calculateScaledRecipeNutrition, syncVersionNutrition } from './nutrition'
import { addWeeks, createId, defaultMacroSplit, getWeekStart } from './utils'

type IngredientProfile = {
  nutritionPer100g?: Nutrition
  unitGrams?: Partial<Record<string, number>>
  nutritionPerUnit?: Partial<Record<string, Nutrition>>
}

const profiles: Record<string, IngredientProfile> = {
  'Cottage Cheese': {
    nutritionPer100g: { calories: 98, protein: 11.1, carbs: 3.4, fat: 4.3 },
    unitGrams: { tbsp: 15 },
  },
  Banana: {
    nutritionPer100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
    unitGrams: { unit: 118 },
  },
  Milk: {
    nutritionPer100g: { calories: 50, protein: 3.4, carbs: 4.8, fat: 1.8 },
    unitGrams: { cup: 240, ml: 1 },
  },
  Egg: {
    nutritionPer100g: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
    unitGrams: { unit: 50 },
  },
  'Rolled Oats': {
    nutritionPer100g: { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5 },
    unitGrams: { cup: 80 },
  },
  'Peanut Butter': {
    nutritionPer100g: { calories: 588, protein: 25, carbs: 20, fat: 50 },
    unitGrams: { tbsp: 16 },
  },
  Pistachios: {
    nutritionPer100g: { calories: 562, protein: 20, carbs: 28, fat: 45 },
    unitGrams: { tbsp: 8, unit: 0.6 },
  },
  Raspberries: {
    nutritionPer100g: { calories: 52, protein: 1.2, carbs: 12, fat: 0.7 },
    unitGrams: { cup: 123 },
  },
  Matcha: {
    nutritionPer100g: { calories: 324, protein: 30.6, carbs: 38.5, fat: 5.3 },
    unitGrams: { tsp: 2 },
  },
  'Matcha Latte Pouch': {
    nutritionPerUnit: {
      pouch: { calories: 47, protein: 1, carbs: 9, fat: 0.5 },
    },
  },
  'Maple Syrup': {
    nutritionPer100g: { calories: 260, protein: 0, carbs: 67, fat: 0 },
    unitGrams: { tsp: 6, tbsp: 20 },
  },
  'Chocolate Flakes': {
    nutritionPer100g: { calories: 500, protein: 5, carbs: 60, fat: 28 },
    unitGrams: { tsp: 2 },
  },
  'Baking Powder': {
    nutritionPer100g: { calories: 53, protein: 0, carbs: 28, fat: 0 },
    unitGrams: { tsp: 4 },
  },
  Salt: {
    nutritionPer100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    unitGrams: { pinch: 0.36, tsp: 6 },
  },
  'Pistachio Butter': {
    nutritionPer100g: { calories: 614, protein: 20, carbs: 22, fat: 51 },
    unitGrams: { tbsp: 16 },
  },
  'Chicken Thighs': {
    nutritionPer100g: { calories: 177, protein: 20, carbs: 0, fat: 11 },
    unitGrams: { g: 1 },
  },
  'Black Pepper': {
    nutritionPer100g: { calories: 251, protein: 10.4, carbs: 64, fat: 3.3 },
    unitGrams: { tbsp: 7, tsp: 2.3 },
  },
  'Garlic Paste': {
    nutritionPer100g: { calories: 130, protein: 6, carbs: 30, fat: 0.5 },
    unitGrams: { tbsp: 15, tsp: 5 },
  },
  'Ginger Paste': {
    nutritionPer100g: { calories: 80, protein: 1.8, carbs: 18, fat: 0.8 },
    unitGrams: { tbsp: 15, tsp: 5 },
  },
  'Soy Sauce': {
    nutritionPer100g: { calories: 53, protein: 8, carbs: 4.9, fat: 0.6 },
    unitGrams: { ml: 1, tbsp: 15, cup: 240 },
  },
  Gochujang: {
    nutritionPer100g: { calories: 211, protein: 4.9, carbs: 43, fat: 3.4 },
    unitGrams: { tbsp: 17, tsp: 5.7 },
  },
  Sriracha: {
    nutritionPer100g: { calories: 93, protein: 1.3, carbs: 19, fat: 0.9 },
    unitGrams: { tsp: 5, tbsp: 15 },
  },
  'Sesame Seeds': {
    nutritionPer100g: { calories: 573, protein: 17.7, carbs: 23.4, fat: 49.7 },
    unitGrams: { tbsp: 9, tsp: 3 },
  },
  Cucumber: {
    nutritionPer100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
    unitGrams: { unit: 300 },
  },
  Garlic: {
    nutritionPer100g: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5 },
    unitGrams: { tsp: 3, unit: 5 },
  },
  Honey: {
    nutritionPer100g: { calories: 304, protein: 0.3, carbs: 82.4, fat: 0 },
    unitGrams: { tsp: 7, tbsp: 21 },
  },
  'Rice Vinegar': {
    nutritionPer100g: { calories: 18, protein: 0, carbs: 0, fat: 0 },
    unitGrams: { ml: 1, tbsp: 15, tsp: 5, cup: 240 },
  },
  'Red Pepper Flakes': {
    nutritionPer100g: { calories: 318, protein: 12, carbs: 56, fat: 17 },
    unitGrams: { tsp: 2 },
  },
  'Light Soy Sauce': {
    nutritionPer100g: { calories: 53, protein: 8, carbs: 4.9, fat: 0.6 },
    unitGrams: { ml: 1, tbsp: 15 },
  },
  Edamame: {
    nutritionPer100g: { calories: 121, protein: 11.9, carbs: 8.9, fat: 5.2 },
    unitGrams: { g: 1 },
  },
  Salmon: {
    nutritionPer100g: { calories: 208, protein: 20, carbs: 0, fat: 13 },
    unitGrams: { g: 1 },
  },
  'Brown Rice': {
    nutritionPer100g: { calories: 123, protein: 2.7, carbs: 25.6, fat: 1 },
    unitGrams: { cup: 195, g: 1 },
  },
  Quinoa: {
    nutritionPer100g: { calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9 },
    unitGrams: { cup: 185, g: 1 },
  },
  Lentils: {
    nutritionPer100g: { calories: 116, protein: 9, carbs: 20, fat: 0.4 },
    unitGrams: { can: 240, g: 1 },
  },
  Broccoli: {
    nutritionPer100g: { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
    unitGrams: { g: 1 },
  },
  'Green Onion': {
    nutritionPer100g: { calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2 },
    unitGrams: { unit: 15 },
  },
  'Pickled Beetroot': {
    nutritionPer100g: { calories: 43, protein: 1.6, carbs: 10, fat: 0.1 },
    unitGrams: { unit: 75 },
  },
  Tahini: {
    nutritionPer100g: { calories: 595, protein: 17, carbs: 21, fat: 54 },
    unitGrams: { tbsp: 15 },
  },
  Water: {
    nutritionPer100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    unitGrams: { cup: 240, ml: 1 },
  },
  'Apple Cider Vinegar': {
    nutritionPer100g: { calories: 21, protein: 0, carbs: 0.9, fat: 0 },
    unitGrams: { tsp: 5, tbsp: 15 },
  },
  'Low-Sodium Soy Sauce': {
    nutritionPer100g: { calories: 53, protein: 8, carbs: 4.9, fat: 0.6 },
    unitGrams: { cup: 240, tbsp: 15 },
  },
  'Sesame Oil': {
    nutritionPer100g: { calories: 884, protein: 0, carbs: 0, fat: 100 },
    unitGrams: { tsp: 4.5 },
  },
  Cornstarch: {
    nutritionPer100g: { calories: 381, protein: 0.3, carbs: 91, fat: 0.1 },
    unitGrams: { tsp: 3 },
  },
  Ginger: {
    nutritionPer100g: { calories: 80, protein: 1.8, carbs: 18, fat: 0.8 },
    unitGrams: { tsp: 2, unit: 5 },
  },
}

function line(
  id: string,
  group: string,
  name: string,
  rawText: string,
  quantity: number | null,
  unit: string | null,
  category: IngredientLine['category'],
  notes?: string,
  isIncomplete?: boolean,
): IngredientLine {
  const profile = profiles[name] ?? {}
  return {
    id,
    group,
    name,
    rawText,
    quantity,
    unit,
    category,
    nutritionPer100g: profile.nutritionPer100g,
    unitGrams: profile.unitGrams,
    nutritionPerUnit: profile.nutritionPerUnit,
    notes,
    isIncomplete,
  }
}

function toIngredientRecord(line: IngredientLine): IngredientRecord | null {
  if (!line.nutritionPer100g) return null
  return {
    id: createId('ingredientdb'),
    name: line.name,
    source: 'default',
    category: line.category,
    nutritionPer100g: line.nutritionPer100g,
    unitGrams: line.unitGrams ?? { g: 1 },
    notes: line.notes,
  }
}

function buildIngredientDb(templates: RecipeTemplate[]): IngredientRecord[] {
  const byName = new Map<string, IngredientRecord>()
  templates.forEach((template) => {
    template.ingredients.forEach((line) => {
      const record = toIngredientRecord(line)
      if (!record) return
      const key = line.name.trim().toLowerCase()
      if (byName.has(key)) return
      byName.set(key, record)
    })
  })
  return Array.from(byName.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

const baseTemplates: RecipeTemplate[] = [
  {
    id: 'template-matcha-oatmeal',
    name: 'Matcha Baked Oatmeal',
    description:
      'Meal-prep breakfast bake with berries, matcha, and a pistachio topping.',
    defaultServings: 4,
    defaultCookPortions: 4,
    mealType: 'breakfast',
    nutritionSource: 'calculated',
    nutritionPerServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    instructions: [
      'Blend the wet ingredients, fold through the dry ingredients, and bake until set.',
      'Finish with the pistachio topping before portioning into boxes.',
    ],
    tags: ['Breakfast', 'Prep', 'Sweet'],
    notes:
      'Nutrition is now calculated from ingredient data. Unknown lines stay flagged.',
    ingredients: [
      line('m1', 'main', 'Cottage Cheese', '4 tbsp cottage cheese', 4, 'tbsp', 'meatDairy'),
      line('m2', 'main', 'Banana', '2 banana', 2, 'unit', 'fruitVeg'),
      line('m3', 'main', 'Milk', '1 cup milk', 1, 'cup', 'meatDairy'),
      line('m4', 'main', 'Egg', '1 egg', 1, 'unit', 'meatDairy'),
      line('m5', 'main', 'Rolled Oats', '1 1/3 cup rolled oats', 1.33, 'cup', 'pantry'),
      line('m6', 'main', 'Peanut Butter', '1 tbsp peanut butter', 1, 'tbsp', 'pantry'),
      line('m7', 'main', 'Pistachios', '1 pistachio', 1, 'unit', 'pantry', 'Kept as written from your note.', true),
      line('m8', 'main', 'Pistachios', '2 tbsp pistachios', 2, 'tbsp', 'pantry'),
      line('m9', 'main', 'Raspberries', '1 cup raspberries', 1, 'cup', 'fruitVeg'),
      line('m10', 'main', 'Matcha', '4 tsp matcha', 4, 'tsp', 'pantry'),
      line('m11', 'main', 'Matcha Latte Pouch', '2 matcha latte pouches (94 cal)', 2, 'pouch', 'pantry'),
      line('m12', 'main', 'Maple Syrup', '2 tsp maple syrup', 2, 'tsp', 'pantry'),
      line('m13', 'main', 'Chocolate Flakes', '4 tsp chocolate flakes', 4, 'tsp', 'pantry'),
      line('m14', 'main', 'Baking Powder', '1 tsp baking powder', 1, 'tsp', 'pantry'),
      line('m15', 'main', 'Salt', 'Pinch salt', 1, 'pinch', 'pantry'),
      line('m16', 'topping', 'Pistachio Butter', '1 tbsp pistachio butter', 1, 'tbsp', 'pantry'),
      line('m17', 'topping', 'Maple Syrup', '2 tsp maple syrup', 2, 'tsp', 'pantry'),
      line('m18', 'topping', 'Pistachios', '1 tbsp pistachios', 1, 'tbsp', 'pantry'),
    ],
  },
  {
    id: 'template-korean-thighs',
    name: 'Korean BBQ Thighs',
    description:
      'Spicy chicken thighs with a crunchy gochujang cucumber side.',
    defaultServings: 4,
    defaultCookPortions: 4,
    mealType: 'dinner',
    nutritionSource: 'calculated',
    nutritionPerServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    instructions: [
      'Marinate the chicken thighs, dress the cucumbers, and cook the thighs at 200C for 16 to 18 minutes.',
      'Portion into boxes and add the cucumbers once cooled.',
    ],
    tags: ['Dinner', 'Prep', 'Savory'],
    notes:
      'Some ingredients still need exact quantities, so calculations stay flagged as partial until those are filled in.',
    ingredients: [
      line('k1', 'thighs', 'Chicken Thighs', 'Chicken thighs - quantity not yet provided', null, null, 'meatDairy', 'Quantity still needed.', true),
      line('k2', 'thighs', 'Black Pepper', '1 tbsp black pepper', 1, 'tbsp', 'pantry'),
      line('k3', 'thighs', 'Garlic Paste', '1 tbsp garlic paste', 1, 'tbsp', 'pantry'),
      line('k4', 'thighs', 'Ginger Paste', '1 tbsp ginger paste', 1, 'tbsp', 'pantry'),
      line('k5', 'thighs', 'Soy Sauce', '25 ml soy sauce', 25, 'ml', 'pantry'),
      line('k6', 'thighs', 'Gochujang', '1 tbsp gochujang', 1, 'tbsp', 'pantry'),
      line('k7', 'thighs', 'Sriracha', 'sriracha squeeeeze', null, null, 'pantry', 'Quantity still needed.', true),
      line('k8', 'thighs', 'Sesame Seeds', '1 tbsp sesame seeds', 1, 'tbsp', 'pantry'),
      line('k9', 'cucumbers', 'Cucumber', 'Cucumber - quantity not yet provided', null, null, 'fruitVeg', 'Quantity still needed.', true),
      line('k10', 'cucumbers', 'Salt', '1 tsp salt', 1, 'tsp', 'pantry'),
      line('k11', 'cucumbers', 'Garlic', '1 tsp fresh garlic', 1, 'tsp', 'fruitVeg'),
      line('k12', 'cucumbers', 'Gochujang', '1 tbsp gochujang', 1, 'tbsp', 'pantry'),
      line('k13', 'cucumbers', 'Honey', '1 tsp honey', 1, 'tsp', 'pantry'),
      line('k14', 'cucumbers', 'Rice Vinegar', '30 ml rice vinegar', 30, 'ml', 'pantry'),
      line('k15', 'cucumbers', 'Red Pepper Flakes', '1 tsp red pepper flakes', 1, 'tsp', 'pantry'),
      line('k16', 'cucumbers', 'Light Soy Sauce', '25 ml light soy sauce', 25, 'ml', 'pantry'),
      line('k17', 'cucumbers', 'Sesame Seeds', '1 tbsp sesame seeds', 1, 'tbsp', 'pantry'),
    ],
  },
  {
    id: 'template-teriyaki-salmon',
    name: 'Teriyaki Salmon',
    description:
      'Salmon, grains, greens, and a beetroot tahini dressing with teriyaki glaze.',
    defaultServings: 4,
    defaultCookPortions: 4,
    mealType: 'lunch',
    nutritionSource: 'calculated',
    nutritionPerServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    instructions: [
      'Cook the salmon, grains, lentils, and broccoli.',
      'Whisk the dressing and glaze, then portion into boxes and finish with sesame seeds and green onion.',
    ],
    tags: ['Lunch', 'Prep', 'Protein'],
    notes:
      'Nutrition is computed from ingredient assumptions and updates automatically when quantities change.',
    ingredients: [
      line('t1', 'main', 'Edamame', 'Edamame 77g', 77, 'g', 'fruitVeg', 'Need to confirm whether this is total or per serving.', true),
      line('t2', 'main', 'Salmon', 'Salmon 125 g/serving = 500g total', 500, 'g', 'meatDairy'),
      line('t3', 'main', 'Brown Rice', 'Brown rice 1/4 cup', 0.25, 'cup', 'pantry', 'Need to confirm whether this is total or per serving.', true),
      line('t4', 'main', 'Quinoa', 'Quinoa 1/4 cup', 0.25, 'cup', 'pantry', 'Need to confirm whether this is total or per serving.', true),
      line('t5', 'main', 'Lentils', 'Lentils 1/2 can', 0.5, 'can', 'pantry', 'Need to confirm whether this is total or per serving.', true),
      line('t6', 'main', 'Broccoli', 'Broccoli 300g', 300, 'g', 'fruitVeg'),
      line('t7', 'main', 'Sesame Seeds', 'Top with 1 tsp sesame seeds', 1, 'tsp', 'pantry'),
      line('t8', 'main', 'Green Onion', '1 green onion', 1, 'unit', 'fruitVeg'),
      line('t9', 'beetroot tahini dressing', 'Pickled Beetroot', '1 pickled beetroot', 1, 'unit', 'fruitVeg'),
      line('t10', 'beetroot tahini dressing', 'Tahini', '1 tbsp tahini', 1, 'tbsp', 'pantry'),
      line('t11', 'beetroot tahini dressing', 'Water', '1/8 cup room temperature water', 0.125, 'cup', 'pantry'),
      line('t12', 'beetroot tahini dressing', 'Apple Cider Vinegar', '1 tsp apple cider vinegar', 1, 'tsp', 'pantry'),
      line('t13', 'beetroot tahini dressing', 'Maple Syrup', '1/2 tsp maple syrup', 0.5, 'tsp', 'pantry'),
      line('t14', 'teriyaki glaze', 'Low-Sodium Soy Sauce', '1/4 cup low-sodium soy sauce', 0.25, 'cup', 'pantry'),
      line('t15', 'teriyaki glaze', 'Honey', '1 tbsp honey', 1, 'tbsp', 'pantry'),
      line('t16', 'teriyaki glaze', 'Rice Vinegar', '1 tbsp rice vinegar', 1, 'tbsp', 'pantry'),
      line('t17', 'teriyaki glaze', 'Sesame Oil', '1 tsp sesame oil', 1, 'tsp', 'pantry'),
      line('t18', 'teriyaki glaze', 'Cornstarch', '1 tsp cornstarch', 1, 'tsp', 'pantry'),
      line('t19', 'teriyaki glaze', 'Garlic', 'Garlic & ginger - negligible', null, null, 'fruitVeg', 'Quantity still needed.', true),
      line('t20', 'teriyaki glaze', 'Ginger', 'Garlic & ginger - negligible', null, null, 'fruitVeg', 'Quantity still needed.', true),
    ],
  },
]

export const seedTemplates: RecipeTemplate[] = baseTemplates.map((template) => {
  const calculated = calculateScaledRecipeNutrition(
    template.ingredients,
    template.defaultServings,
    template.defaultCookPortions,
  )

  return {
    ...template,
    nutritionPerServing: calculated.perServing,
  }
})

function versionFromTemplate(
  template: RecipeTemplate,
  weekStart: string,
  tweaks?: Partial<RecipeVersion>,
): RecipeVersion {
  const now = new Date().toISOString()
  const cloneIngredient = (ingredient: IngredientLine): IngredientLine => ({
    ...ingredient,
    nutritionPer100g: ingredient.nutritionPer100g
      ? { ...ingredient.nutritionPer100g }
      : undefined,
    unitGrams: ingredient.unitGrams ? { ...ingredient.unitGrams } : {},
    nutritionPerUnit: ingredient.nutritionPerUnit ? { ...ingredient.nutritionPerUnit } : {},
  })

  return syncVersionNutrition({
    id: tweaks?.id ?? createId('version'),
    templateId: template.id,
    weekStart,
    name: tweaks?.name ?? template.name,
    servings: tweaks?.servings ?? template.defaultServings,
    cookPortions: tweaks?.cookPortions ?? template.defaultCookPortions,
    mealType: tweaks?.mealType ?? template.mealType,
    notes: tweaks?.notes ?? template.notes ?? '',
    nutritionPerServing: template.nutritionPerServing,
    unresolvedIngredients: 0,
    instructions: tweaks?.instructions ? [...tweaks.instructions] : [...template.instructions],
    ingredients: tweaks?.ingredients
      ? tweaks.ingredients.map(cloneIngredient)
      : template.ingredients.map(cloneIngredient),
    createdAt: tweaks?.createdAt ?? now,
    updatedAt: tweaks?.updatedAt ?? now,
    lastMadeAt: tweaks?.lastMadeAt,
  })
}

function buildBoxes(version: RecipeVersion) {
  const syncedVersion = syncVersionNutrition(version)
  const batchId = createId('batch')
  const boxes: MealBox[] = Array.from({ length: syncedVersion.servings }, (_, index) => ({
    id: createId('box'),
    recipeVersionId: syncedVersion.id,
    weekStart: syncedVersion.weekStart,
    label: syncedVersion.name,
    batchId,
    boxNumber: index + 1,
    portionFraction: 1,
    baseNutrition: syncedVersion.nutritionPerServing,
    createdAt: new Date().toISOString(),
  }))
  return { batchId, boxes }
}

function buildCurrentWeek(weekStart: string) {
  const oatmeal = versionFromTemplate(seedTemplates[0], weekStart, {
    id: 'version-current-oatmeal',
    notes: 'Scaled for weekday breakfasts.',
  })
  const salmon = versionFromTemplate(seedTemplates[2], weekStart, {
    id: 'version-current-salmon',
    servings: 5,
    notes: 'Bumped to 5 lunches for the work week.',
  })
  const korean = versionFromTemplate(seedTemplates[1], weekStart, {
    id: 'version-current-korean',
    notes: 'Still needs exact chicken weight; keeping draft ingredient flags visible.',
  })

  const oatmealBoxes = buildBoxes(oatmeal).boxes
  const salmonBoxes = buildBoxes(salmon).boxes
  const koreanBoxes = buildBoxes(korean).boxes

  const extras: ExtraFood[] = [
    {
      id: 'extra-yogurt',
      weekStart,
      name: 'Protein Yogurt Pot',
      mealType: 'snack',
      nutrition: { calories: 145, protein: 16, carbs: 8, fat: 4 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'extra-almonds',
      weekStart,
      name: 'Half Handful Almonds',
      mealType: 'snack',
      nutrition: { calories: 98, protein: 3.5, carbs: 3, fat: 8.5 },
      createdAt: new Date().toISOString(),
    },
  ]

  const entries: PlannerEntry[] = [
    ...oatmealBoxes.map((box, index) => ({
      id: `entry-oat-${index}`,
      weekStart,
      dayIndex: index,
      mealType: 'breakfast' as const,
      sourceType: 'box' as const,
      sourceId: box.id,
      consumedFraction: index < 3 ? 1 : 0.75,
      createdAt: new Date().toISOString(),
    })),
    ...salmonBoxes.map((box, index) => ({
      id: `entry-salmon-${index}`,
      weekStart,
      dayIndex: index,
      mealType: 'lunch' as const,
      sourceType: 'box' as const,
      sourceId: box.id,
      consumedFraction: 1,
      createdAt: new Date().toISOString(),
    })),
    ...koreanBoxes.map((box, index) => ({
      id: `entry-korean-${index}`,
      weekStart,
      dayIndex: index + 1,
      mealType: 'dinner' as const,
      sourceType: 'box' as const,
      sourceId: box.id,
      consumedFraction: index === 2 ? 0.5 : 1,
      createdAt: new Date().toISOString(),
    })),
    {
      id: 'entry-extra-1',
      weekStart,
      dayIndex: 1,
      mealType: 'snack',
      sourceType: 'extra',
      sourceId: extras[0].id,
      consumedFraction: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'entry-extra-2',
      weekStart,
      dayIndex: 4,
      mealType: 'snack',
      sourceType: 'extra',
      sourceId: extras[1].id,
      consumedFraction: 1,
      createdAt: new Date().toISOString(),
    },
  ]

  const week: WeekPlan = {
    weekStart,
    title: 'Current Prep Week',
    recipeVersionIds: [oatmeal.id, salmon.id, korean.id],
    boxIds: [...oatmealBoxes, ...salmonBoxes, ...koreanBoxes].map((box) => box.id),
    entryIds: entries.map((entry) => entry.id),
    extraFoodIds: extras.map((extra) => extra.id),
    shoppingMode: 'allVersions',
    defaultDailyCalorieTarget: 2000,
    dailyCalorieTargets: Array.from({ length: 7 }, () => 2000),
    macroTargetPercentages: defaultMacroSplit(),
    notes: 'Current focus week. Boxes can be reassigned across the grid.',
  }

  return {
    versions: [oatmeal, salmon, korean],
    boxes: [...oatmealBoxes, ...salmonBoxes, ...koreanBoxes],
    extras,
    entries,
    week,
  }
}

function buildHistoryWeek(currentWeekStart: string) {
  const weekStart = addWeeks(currentWeekStart, -1)
  const oatmeal = versionFromTemplate(seedTemplates[0], weekStart, {
    id: 'version-history-oatmeal',
    servings: 3,
    notes: 'Earlier week with smaller portions.',
  })

  const oatmealBoxes = buildBoxes(oatmeal).boxes.map((box, index) => ({
    ...box,
    portionFraction: index === 1 ? 0.5 : 1,
  }))

  const entries: PlannerEntry[] = oatmealBoxes.map((box, index) => ({
    id: `history-entry-${index}`,
    weekStart,
    dayIndex: index,
    mealType: 'breakfast',
    sourceType: 'box',
    sourceId: box.id,
    consumedFraction: index === 1 ? 0.5 : 1,
    createdAt: new Date().toISOString(),
  }))

  const week: WeekPlan = {
    weekStart,
    title: 'Saved History Week',
    recipeVersionIds: [oatmeal.id],
    boxIds: oatmealBoxes.map((box) => box.id),
    entryIds: entries.map((entry) => entry.id),
    extraFoodIds: [],
    shoppingMode: 'assigned',
    defaultDailyCalorieTarget: 1900,
    dailyCalorieTargets: Array.from({ length: 7 }, () => 1900),
    macroTargetPercentages: defaultMacroSplit(),
    notes: 'Used to make the history view feel alive from day one.',
  }

  return {
    versions: [oatmeal],
    boxes: oatmealBoxes,
    extras: [] as ExtraFood[],
    entries,
    week,
  }
}

export function createInitialState(): AppState {
  const weekStart = getWeekStart(new Date())
  const currentWeek = buildCurrentWeek(weekStart)
  const historyWeek = buildHistoryWeek(weekStart)
  return {
    ingredientDb: buildIngredientDb(seedTemplates),
    templates: seedTemplates,
    versions: [...currentWeek.versions, ...historyWeek.versions],
    boxes: [...currentWeek.boxes, ...historyWeek.boxes],
    extras: [...currentWeek.extras, ...historyWeek.extras],
    entries: [...currentWeek.entries, ...historyWeek.entries],
    weeks: [currentWeek.week, historyWeek.week].sort((left, right) =>
      left.weekStart > right.weekStart ? -1 : 1,
    ),
  }
}

export function cloneTemplateIntoWeek(
  template: RecipeTemplate,
  weekStart: string,
): RecipeVersion {
  return versionFromTemplate(template, weekStart)
}

export function scaleVersionServings(version: RecipeVersion, newServings: number) {
  if (newServings <= 0) return version
  return syncVersionNutrition({
    ...version,
    servings: newServings,
    updatedAt: new Date().toISOString(),
  })
}

export function scaleVersionIngredients(version: RecipeVersion, factor: number) {
  if (factor <= 0) return version
  const nextCookPortionsBase = version.cookPortions > 0 ? version.cookPortions : version.servings
  return syncVersionNutrition({
    ...version,
    cookPortions: Number((nextCookPortionsBase * factor).toFixed(2)),
    ingredients: version.ingredients.map((ingredient) => ({
      ...ingredient,
      quantity:
        ingredient.quantity === null
          ? null
          : Number((ingredient.quantity * factor).toFixed(2)),
    })),
    updatedAt: new Date().toISOString(),
  })
}

export function remakeBoxesForVersion(version: RecipeVersion) {
  return buildBoxes(version)
}
