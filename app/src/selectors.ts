import type {
  AppState,
  GroceryCategory,
  PlannerEntry,
  RecipeVersion,
  WeekPlan,
} from './types'
import { addNutrition, emptyNutrition, scaleNutrition } from './utils'

function normalizeShoppingText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function findEntrySource(entry: PlannerEntry, state: AppState) {
  if (entry.sourceType === 'box') {
    const box = state.boxes.find((item) => item.id === entry.sourceId)
    if (!box) return null
    return {
      title: `${box.label} box #${box.boxNumber}`,
      planned: scaleNutrition(box.baseNutrition, box.portionFraction),
      portionFraction: box.portionFraction,
    }
  }

  const extra = state.extras.find((item) => item.id === entry.sourceId)
  if (!extra) return null
  return {
    title: extra.name,
    planned: extra.nutrition,
    portionFraction: 1,
  }
}

export function buildWeekSummary(entries: PlannerEntry[], state: AppState) {
  const planned = entries.reduce((total, entry) => {
    const source = findEntrySource(entry, state)
    return source ? addNutrition(total, source.planned) : total
  }, emptyNutrition())

  const consumed = entries.reduce((total, entry) => {
    const source = findEntrySource(entry, state)
    return source ? addNutrition(total, scaleNutrition(source.planned, entry.consumedFraction)) : total
  }, emptyNutrition())

  return { planned, consumed }
}

export function buildDaySummary(
  dayIndex: number,
  entries: PlannerEntry[],
  state: AppState,
) {
  return buildWeekSummary(
    entries.filter((entry) => entry.dayIndex === dayIndex),
    state,
  )
}

export function generateShoppingList(
  week: WeekPlan,
  state: AppState,
  versions: RecipeVersion[],
  entries: PlannerEntry[],
) {
  const totals = new Map<
    string,
    {
      category: GroceryCategory
      name: string
      unit: string | null
      quantity: number | null
      incomplete: boolean
    }
  >()

  versions.forEach((version) => {
    const versionBoxes = state.boxes.filter((box) => box.recipeVersionId === version.id)
    if (versionBoxes.length === 0) return

    let factor = 1
    if (week.shoppingMode === 'assigned') {
      const assigned = entries
        .filter((entry) => entry.sourceType === 'box')
        .map((entry) => {
          const box = versionBoxes.find((item) => item.id === entry.sourceId)
          return box ? box.portionFraction : 0
        })
        .reduce((sum, value) => sum + value, 0)
      factor = version.servings === 0 ? 0 : assigned / version.servings
    }

    version.ingredients.forEach((ingredient) => {
      const normalizedName = normalizeShoppingText(ingredient.name)
      const normalizedUnit = normalizeShoppingText(ingredient.unit)
      const key = `${normalizedName}-${normalizedUnit || 'unit'}-${ingredient.category}`
      const existing = totals.get(key)
      const scaledQuantity =
        ingredient.quantity === null ? null : Number((ingredient.quantity * factor).toFixed(2))

      if (!existing) {
        totals.set(key, {
          category: ingredient.category,
          name: ingredient.name.trim(),
          unit: ingredient.unit?.trim() || null,
          quantity: scaledQuantity,
          incomplete: Boolean(ingredient.isIncomplete || scaledQuantity === null),
        })
        return
      }

      totals.set(key, {
        ...existing,
        quantity:
          existing.quantity === null || scaledQuantity === null
            ? null
            : Number((existing.quantity + scaledQuantity).toFixed(2)),
        incomplete:
          existing.incomplete || Boolean(ingredient.isIncomplete || scaledQuantity === null),
      })
    })
  })

  return (['pantry', 'fruitVeg', 'meatDairy'] as GroceryCategory[]).map((category) => ({
    category,
    items: Array.from(totals.values())
      .filter((item) => item.category === category)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((item) => ({
        ...item,
        quantityText:
          item.quantity === null ? 'TBD' : `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`,
      })),
  }))
}

export function buildStats(state: AppState) {
  const weekBreakdown = state.weeks.map((week) => {
    const entries = state.entries.filter((entry) => week.entryIds.includes(entry.id))
    const summary = buildWeekSummary(entries, state)
    return {
      weekStart: week.weekStart,
      entries: entries.length,
      plannedCalories: summary.planned.calories,
      consumedCalories: summary.consumed.calories,
      consumedProtein: summary.consumed.protein,
    }
  })

  const weekCount = weekBreakdown.length || 1
  const totalPlanned = weekBreakdown.reduce((sum, week) => sum + week.plannedCalories, 0)
  const totalConsumed = weekBreakdown.reduce((sum, week) => sum + week.consumedCalories, 0)
  const totalProtein = weekBreakdown.reduce((sum, week) => sum + week.consumedProtein, 0)
  const maxCalories = Math.max(...weekBreakdown.map((week) => week.plannedCalories), 1)

  return {
    weekCount,
    averagePlannedCalories: Math.round(totalPlanned / weekCount / 7),
    averageConsumedCalories: Math.round(totalConsumed / weekCount / 7),
    averageConsumedProtein: Math.round((totalProtein / weekCount / 7) * 10) / 10,
    weekBreakdown: weekBreakdown.map((week) => ({
      ...week,
      plannedRatio: Math.max(8, (week.plannedCalories / maxCalories) * 100),
      consumedRatio: Math.max(8, (week.consumedCalories / maxCalories) * 100),
    })),
  }
}
