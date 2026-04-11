export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type GroceryCategory = 'pantry' | 'fruitVeg' | 'meatDairy'

export type ShoppingMode = 'assigned' | 'allVersions'

export type TabKey = 'weekly' | 'recipes' | 'ingredients' | 'calendar' | 'stats'

export type Nutrition = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type MacroSplit = {
  protein: number
  carbs: number
  fat: number
}

export type IngredientLine = {
  id: string
  group: string
  name: string
  rawText: string
  quantity: number | null
  unit: string | null
  category: GroceryCategory
  nutritionPer100g?: Nutrition
  unitGrams?: Partial<Record<string, number>>
  nutritionPerUnit?: Partial<Record<string, Nutrition>>
  notes?: string
  isIncomplete?: boolean
}

export type IngredientRecord = {
  id: string
  name: string
  source: 'default' | 'user'
  category: GroceryCategory
  nutritionPer100g: Nutrition
  unitGrams: Partial<Record<string, number>>
  notes?: string
}

export type RecipeTemplate = {
  id: string
  name: string
  description: string
  defaultServings: number
  defaultCookPortions: number
  mealType: MealType
  nutritionSource: 'calculated' | 'future-import'
  nutritionPerServing: Nutrition
  instructions: string[]
  tags: string[]
  notes?: string
  ingredients: IngredientLine[]
}

export type RecipeVersion = {
  id: string
  templateId: string
  weekStart: string
  name: string
  servings: number
  cookPortions: number
  mealType: MealType
  notes: string
  nutritionPerServing: Nutrition
  unresolvedIngredients: number
  instructions: string[]
  ingredients: IngredientLine[]
  createdAt: string
  updatedAt: string
  lastMadeAt?: string
}

export type MealBox = {
  id: string
  recipeVersionId: string
  weekStart: string
  label: string
  batchId: string
  boxNumber: number
  portionFraction: number
  baseNutrition: Nutrition
  createdAt: string
}

export type ExtraFood = {
  id: string
  weekStart: string
  name: string
  mealType: MealType
  nutrition: Nutrition
  createdAt: string
}

export type PlannerEntry = {
  id: string
  weekStart: string
  dayIndex: number
  mealType: MealType
  sourceType: 'box' | 'extra'
  sourceId: string
  consumedFraction: number
  createdAt: string
}

export type WeekPlan = {
  weekStart: string
  title: string
  recipeVersionIds: string[]
  boxIds: string[]
  entryIds: string[]
  extraFoodIds: string[]
  shoppingMode: ShoppingMode
  defaultDailyCalorieTarget: number | null
  dailyCalorieTargets: Array<number | null>
  macroTargetPercentages: MacroSplit
  notes: string
}

export type AppState = {
  ingredientDb: IngredientRecord[]
  templates: RecipeTemplate[]
  versions: RecipeVersion[]
  boxes: MealBox[]
  extras: ExtraFood[]
  entries: PlannerEntry[]
  weeks: WeekPlan[]
}
