import { createClient } from '@supabase/supabase-js'
import type {
  AppState,
  ExtraFood,
  IngredientLine,
  IngredientRecord,
  MealBox,
  PlannerEntry,
  RecipeTemplate,
  RecipeVersion,
  WeekPlan,
} from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isCloudConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const supabase =
  isCloudConfigured && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

async function requireUserId() {
  if (!supabase) return null
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  if (!user?.id) throw new Error('Please sign in first')
  return user.id
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.message?.toLowerCase().includes('does not exist') === true
  )
}

function normalizeNutrition(value: unknown) {
  const record = typeof value === 'object' && value !== null ? value : {}
  const source = record as Record<string, unknown>
  return {
    calories: Number(source.calories ?? 0),
    protein: Number(source.protein ?? 0),
    carbs: Number(source.carbs ?? 0),
    fat: Number(source.fat ?? 0),
  }
}

function normalizeIngredientLine(record: Record<string, unknown>): IngredientLine {
  return {
    id: String(record.id ?? ''),
    group: String(record.group_name ?? ''),
    name: String(record.name ?? ''),
    rawText: String(record.raw_text ?? ''),
    quantity:
      record.quantity === null || record.quantity === undefined
        ? null
        : Number(record.quantity),
    unit: record.unit === null || record.unit === undefined ? null : String(record.unit),
    category: String(record.category ?? 'pantry') as IngredientLine['category'],
    nutritionPer100g:
      record.nutrition_per_100g && typeof record.nutrition_per_100g === 'object'
        ? normalizeNutrition(record.nutrition_per_100g)
        : undefined,
    unitGrams:
      record.unit_grams && typeof record.unit_grams === 'object'
        ? (record.unit_grams as IngredientLine['unitGrams'])
        : undefined,
    nutritionPerUnit:
      record.nutrition_per_unit && typeof record.nutrition_per_unit === 'object'
        ? (record.nutrition_per_unit as IngredientLine['nutritionPerUnit'])
        : undefined,
    notes: record.notes ? String(record.notes) : undefined,
    isIncomplete: Boolean(record.is_incomplete),
  }
}

function toTemplateRow(userId: string, template: RecipeTemplate) {
  return {
    user_id: userId,
    id: template.id,
    name: template.name,
    description: template.description,
    default_servings: template.defaultServings,
    default_cook_portions: template.defaultCookPortions,
    meal_type: template.mealType,
    nutrition_source: template.nutritionSource,
    nutrition_per_serving: template.nutritionPerServing,
    instructions: template.instructions,
    tags: template.tags,
    notes: template.notes ?? null,
    updated_at: new Date().toISOString(),
  }
}

function toTemplateIngredientRow(
  userId: string,
  templateId: string,
  line: IngredientLine,
  sortIndex: number,
) {
  return {
    user_id: userId,
    template_id: templateId,
    id: line.id,
    sort_index: sortIndex,
    group_name: line.group,
    name: line.name,
    raw_text: line.rawText,
    quantity: line.quantity,
    unit: line.unit,
    category: line.category,
    nutrition_per_100g: line.nutritionPer100g ?? null,
    unit_grams: line.unitGrams ?? null,
    nutrition_per_unit: line.nutritionPerUnit ?? null,
    notes: line.notes ?? null,
    is_incomplete: Boolean(line.isIncomplete),
  }
}

function toVersionRow(userId: string, version: RecipeVersion) {
  return {
    user_id: userId,
    id: version.id,
    template_id: version.templateId,
    week_start: version.weekStart,
    name: version.name,
    servings: version.servings,
    cook_portions: version.cookPortions,
    meal_type: version.mealType,
    notes: version.notes,
    nutrition_per_serving: version.nutritionPerServing,
    unresolved_ingredients: version.unresolvedIngredients,
    instructions: version.instructions,
    created_at: version.createdAt,
    updated_at: version.updatedAt,
    last_made_at: version.lastMadeAt ?? null,
  }
}

function toVersionIngredientRow(
  userId: string,
  versionId: string,
  line: IngredientLine,
  sortIndex: number,
) {
  return {
    user_id: userId,
    version_id: versionId,
    id: line.id,
    sort_index: sortIndex,
    group_name: line.group,
    name: line.name,
    raw_text: line.rawText,
    quantity: line.quantity,
    unit: line.unit,
    category: line.category,
    nutrition_per_100g: line.nutritionPer100g ?? null,
    unit_grams: line.unitGrams ?? null,
    nutrition_per_unit: line.nutritionPerUnit ?? null,
    notes: line.notes ?? null,
    is_incomplete: Boolean(line.isIncomplete),
  }
}

function toIngredientRecordRow(userId: string, ingredient: IngredientRecord) {
  return {
    user_id: userId,
    id: ingredient.id,
    name: ingredient.name,
    source: ingredient.source,
    category: ingredient.category,
    nutrition_per_100g: ingredient.nutritionPer100g,
    unit_grams: ingredient.unitGrams,
    notes: ingredient.notes ?? null,
  }
}

function toBoxRow(userId: string, box: MealBox) {
  return {
    user_id: userId,
    id: box.id,
    recipe_version_id: box.recipeVersionId,
    week_start: box.weekStart,
    label: box.label,
    batch_id: box.batchId,
    box_number: box.boxNumber,
    portion_fraction: box.portionFraction,
    base_nutrition: box.baseNutrition,
    created_at: box.createdAt,
  }
}

function toExtraRow(userId: string, extra: ExtraFood) {
  return {
    user_id: userId,
    id: extra.id,
    week_start: extra.weekStart,
    name: extra.name,
    meal_type: extra.mealType,
    nutrition: extra.nutrition,
    created_at: extra.createdAt,
  }
}

function toEntryRow(userId: string, entry: PlannerEntry) {
  return {
    user_id: userId,
    id: entry.id,
    week_start: entry.weekStart,
    day_index: entry.dayIndex,
    meal_type: entry.mealType,
    source_type: entry.sourceType,
    source_id: entry.sourceId,
    consumed_fraction: entry.consumedFraction,
    created_at: entry.createdAt,
  }
}

function toWeekRow(userId: string, week: WeekPlan) {
  return {
    user_id: userId,
    week_start: week.weekStart,
    title: week.title,
    recipe_version_ids: week.recipeVersionIds,
    box_ids: week.boxIds,
    entry_ids: week.entryIds,
    extra_food_ids: week.extraFoodIds,
    shopping_mode: week.shoppingMode,
    default_daily_calorie_target: week.defaultDailyCalorieTarget,
    daily_calorie_targets: week.dailyCalorieTargets,
    macro_target_percentages: week.macroTargetPercentages,
    notes: week.notes,
    updated_at: new Date().toISOString(),
  }
}

async function pullLegacyCloudState(userId: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('mealpreppy_states')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.state as AppState | undefined) ?? null
}

async function pushLegacyCloudState(userId: string, state: AppState) {
  if (!supabase) return
  const { error } = await supabase.from('mealpreppy_states').upsert(
    {
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
}

async function pullRelationalCloudState(userId: string) {
  if (!supabase) return null

  const [
    weeksResult,
    templatesResult,
    templateIngredientsResult,
    versionsResult,
    versionIngredientsResult,
    boxesResult,
    extrasResult,
    entriesResult,
    ingredientDbResult,
  ] = await Promise.all([
    supabase.from('planner_weeks').select('*').eq('user_id', userId),
    supabase.from('recipe_templates').select('*').eq('user_id', userId),
    supabase.from('template_ingredients').select('*').eq('user_id', userId),
    supabase.from('recipe_versions').select('*').eq('user_id', userId),
    supabase.from('version_ingredients').select('*').eq('user_id', userId),
    supabase.from('meal_boxes').select('*').eq('user_id', userId),
    supabase.from('extra_foods').select('*').eq('user_id', userId),
    supabase.from('planner_entries').select('*').eq('user_id', userId),
    supabase.from('ingredient_db').select('*').eq('user_id', userId),
  ])

  const results = [
    weeksResult,
    templatesResult,
    templateIngredientsResult,
    versionsResult,
    versionIngredientsResult,
    boxesResult,
    extrasResult,
    entriesResult,
    ingredientDbResult,
  ]

  const missing = results.some((result) =>
    isMissingRelationError(result.error as { code?: string; message?: string } | null),
  )
  if (missing) return null

  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  const templateIngredientByTemplate = new Map<string, IngredientLine[]>()
  ;(templateIngredientsResult.data ?? [])
    .slice()
    .sort((left, right) => Number(left.sort_index ?? 0) - Number(right.sort_index ?? 0))
    .forEach((row) => {
      const key = String(row.template_id)
      const list = templateIngredientByTemplate.get(key) ?? []
      list.push(normalizeIngredientLine(row as Record<string, unknown>))
      templateIngredientByTemplate.set(key, list)
    })

  const versionIngredientByVersion = new Map<string, IngredientLine[]>()
  ;(versionIngredientsResult.data ?? [])
    .slice()
    .sort((left, right) => Number(left.sort_index ?? 0) - Number(right.sort_index ?? 0))
    .forEach((row) => {
      const key = String(row.version_id)
      const list = versionIngredientByVersion.get(key) ?? []
      list.push(normalizeIngredientLine(row as Record<string, unknown>))
      versionIngredientByVersion.set(key, list)
    })

  const templates: RecipeTemplate[] = (templatesResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    defaultServings: Number(row.default_servings ?? 1),
    defaultCookPortions: Number(row.default_cook_portions ?? row.default_servings ?? 1),
    mealType: String(row.meal_type ?? 'lunch') as RecipeTemplate['mealType'],
    nutritionSource: String(row.nutrition_source ?? 'calculated') as RecipeTemplate['nutritionSource'],
    nutritionPerServing: normalizeNutrition(row.nutrition_per_serving),
    instructions: Array.isArray(row.instructions)
      ? row.instructions.map((value: unknown) => String(value))
      : [],
    tags: Array.isArray(row.tags)
      ? row.tags.map((value: unknown) => String(value))
      : [],
    notes: row.notes === null || row.notes === undefined ? undefined : String(row.notes),
    ingredients: templateIngredientByTemplate.get(String(row.id)) ?? [],
  }))

  const versions: RecipeVersion[] = (versionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    templateId: String(row.template_id ?? ''),
    weekStart: String(row.week_start ?? ''),
    name: String(row.name ?? ''),
    servings: Number(row.servings ?? 1),
    cookPortions: Number(row.cook_portions ?? row.servings ?? 1),
    mealType: String(row.meal_type ?? 'lunch') as RecipeVersion['mealType'],
    notes: String(row.notes ?? ''),
    nutritionPerServing: normalizeNutrition(row.nutrition_per_serving),
    unresolvedIngredients: Number(row.unresolved_ingredients ?? 0),
    instructions: Array.isArray(row.instructions)
      ? row.instructions.map((value: unknown) => String(value))
      : [],
    ingredients: versionIngredientByVersion.get(String(row.id)) ?? [],
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    lastMadeAt:
      row.last_made_at === null || row.last_made_at === undefined
        ? undefined
        : String(row.last_made_at),
  }))

  const ingredientDb: IngredientRecord[] = (ingredientDbResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    source: String(row.source ?? 'user') as IngredientRecord['source'],
    category: String(row.category ?? 'pantry') as IngredientRecord['category'],
    nutritionPer100g: normalizeNutrition(row.nutrition_per_100g),
    unitGrams:
      row.unit_grams && typeof row.unit_grams === 'object'
        ? (row.unit_grams as IngredientRecord['unitGrams'])
        : { g: 1 },
    notes: row.notes === null || row.notes === undefined ? undefined : String(row.notes),
  }))

  const boxes: MealBox[] = (boxesResult.data ?? []).map((row) => ({
    id: String(row.id),
    recipeVersionId: String(row.recipe_version_id ?? ''),
    weekStart: String(row.week_start ?? ''),
    label: String(row.label ?? ''),
    batchId: String(row.batch_id ?? ''),
    boxNumber: Number(row.box_number ?? 1),
    portionFraction: Number(row.portion_fraction ?? 1),
    baseNutrition: normalizeNutrition(row.base_nutrition),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }))

  const extras: ExtraFood[] = (extrasResult.data ?? []).map((row) => ({
    id: String(row.id),
    weekStart: String(row.week_start ?? ''),
    name: String(row.name ?? ''),
    mealType: String(row.meal_type ?? 'snack') as ExtraFood['mealType'],
    nutrition: normalizeNutrition(row.nutrition),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }))

  const entries: PlannerEntry[] = (entriesResult.data ?? []).map((row) => ({
    id: String(row.id),
    weekStart: String(row.week_start ?? ''),
    dayIndex: Number(row.day_index ?? 0),
    mealType: String(row.meal_type ?? 'snack') as PlannerEntry['mealType'],
    sourceType: String(row.source_type ?? 'box') as PlannerEntry['sourceType'],
    sourceId: String(row.source_id ?? ''),
    consumedFraction: Number(row.consumed_fraction ?? 1),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }))

  const weeks: WeekPlan[] = (weeksResult.data ?? []).map((row) => ({
    weekStart: String(row.week_start ?? ''),
    title: String(row.title ?? ''),
    recipeVersionIds: Array.isArray(row.recipe_version_ids)
      ? row.recipe_version_ids.map((value: unknown) => String(value))
      : [],
    boxIds: Array.isArray(row.box_ids)
      ? row.box_ids.map((value: unknown) => String(value))
      : [],
    entryIds: Array.isArray(row.entry_ids)
      ? row.entry_ids.map((value: unknown) => String(value))
      : [],
    extraFoodIds: Array.isArray(row.extra_food_ids)
      ? row.extra_food_ids.map((value: unknown) => String(value))
      : [],
    shoppingMode: String(row.shopping_mode ?? 'allVersions') as WeekPlan['shoppingMode'],
    defaultDailyCalorieTarget:
      row.default_daily_calorie_target === null ||
      row.default_daily_calorie_target === undefined
        ? null
        : Number(row.default_daily_calorie_target),
    dailyCalorieTargets: Array.isArray(row.daily_calorie_targets)
      ? row.daily_calorie_targets.map((value: unknown) =>
          value === null || value === undefined ? null : Number(value),
        )
      : Array.from({ length: 7 }, () => null),
    macroTargetPercentages:
      row.macro_target_percentages && typeof row.macro_target_percentages === 'object'
        ? {
            protein: Number((row.macro_target_percentages as Record<string, unknown>).protein ?? 30),
            carbs: Number((row.macro_target_percentages as Record<string, unknown>).carbs ?? 40),
            fat: Number((row.macro_target_percentages as Record<string, unknown>).fat ?? 30),
          }
        : { protein: 30, carbs: 40, fat: 30 },
    notes: String(row.notes ?? ''),
  }))

  return {
    ingredientDb,
    templates,
    versions,
    boxes,
    extras,
    entries,
    weeks,
  } satisfies AppState
}

async function deleteRowsForUser(userId: string, table: string) {
  if (!supabase) return
  const { error } = await supabase.from(table).delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}

async function insertRows(table: string, rows: Array<Record<string, unknown>>) {
  if (!supabase || rows.length === 0) return
  const { error } = await supabase.from(table).insert(rows)
  if (error) throw new Error(error.message)
}

async function pushRelationalCloudState(userId: string, state: AppState) {
  if (!supabase) return
  const templateIngredientRows = state.templates.flatMap((template) =>
    template.ingredients.map((line, index) =>
      toTemplateIngredientRow(userId, template.id, line, index),
    ),
  )
  const versionIngredientRows = state.versions.flatMap((version) =>
    version.ingredients.map((line, index) =>
      toVersionIngredientRow(userId, version.id, line, index),
    ),
  )

  await deleteRowsForUser(userId, 'planner_entries')
  await deleteRowsForUser(userId, 'extra_foods')
  await deleteRowsForUser(userId, 'meal_boxes')
  await deleteRowsForUser(userId, 'version_ingredients')
  await deleteRowsForUser(userId, 'recipe_versions')
  await deleteRowsForUser(userId, 'template_ingredients')
  await deleteRowsForUser(userId, 'recipe_templates')
  await deleteRowsForUser(userId, 'ingredient_db')
  await deleteRowsForUser(userId, 'planner_weeks')

  await insertRows(
    'ingredient_db',
    state.ingredientDb.map((ingredient) => toIngredientRecordRow(userId, ingredient)),
  )
  await insertRows(
    'recipe_templates',
    state.templates.map((template) => toTemplateRow(userId, template)),
  )
  await insertRows('template_ingredients', templateIngredientRows)
  await insertRows(
    'recipe_versions',
    state.versions.map((version) => toVersionRow(userId, version)),
  )
  await insertRows('version_ingredients', versionIngredientRows)
  await insertRows('meal_boxes', state.boxes.map((box) => toBoxRow(userId, box)))
  await insertRows('extra_foods', state.extras.map((extra) => toExtraRow(userId, extra)))
  await insertRows(
    'planner_entries',
    state.entries.map((entry) => toEntryRow(userId, entry)),
  )
  await insertRows('planner_weeks', state.weeks.map((week) => toWeekRow(userId, week)))
}

export function onCloudAuthChange(listener: (email: string | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session?.user?.email ?? null)
  })
  return () => data.subscription.unsubscribe()
}

export async function getCloudUserEmail() {
  if (!supabase) return null
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  return user?.email ?? null
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Cloud sync not configured')
  const { error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw new Error(error.message)
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Cloud sync not configured')
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw new Error(error.message)
}

export async function signOutCloud() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function pullCloudState() {
  if (!supabase) return null
  const userId = await requireUserId()
  if (!userId) return null

  const relationalState = await pullRelationalCloudState(userId)
  if (relationalState) {
    const hasRelationalData =
      relationalState.weeks.length > 0 ||
      relationalState.templates.length > 0 ||
      relationalState.versions.length > 0 ||
      relationalState.ingredientDb.length > 0
    if (hasRelationalData) return relationalState
  }

  return pullLegacyCloudState(userId)
}

export async function pushCloudState(state: AppState) {
  if (!supabase) return
  const userId = await requireUserId()
  if (!userId) return

  try {
    await pushRelationalCloudState(userId, state)
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown cloud sync error'
    if (!detail.toLowerCase().includes('does not exist')) throw error
  }
  await pushLegacyCloudState(userId, state)
}
