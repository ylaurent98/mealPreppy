import type { GroceryCategory, MacroSplit, MealType, Nutrition } from './types'

export const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const groceryCategories: GroceryCategory[] = [
  'pantry',
  'fruitVeg',
  'meatDairy',
]

export const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export function clampFraction(value: number) {
  if (Number.isNaN(value) || value <= 0) return 0.25
  return Math.min(2, Math.max(0.25, Number(value.toFixed(2))))
}

export function emptyNutrition(): Nutrition {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 }
}

export function defaultMacroSplit(): MacroSplit {
  return { protein: 30, carbs: 40, fat: 30 }
}

export function scaleNutrition(nutrition: Nutrition, factor: number): Nutrition {
  return {
    calories: round(nutrition.calories * factor),
    protein: round(nutrition.protein * factor),
    carbs: round(nutrition.carbs * factor),
    fat: round(nutrition.fat * factor),
  }
}

export function addNutrition(left: Nutrition, right: Nutrition): Nutrition {
  return {
    calories: round(left.calories + right.calories),
    protein: round(left.protein + right.protein),
    carbs: round(left.carbs + right.carbs),
    fat: round(left.fat + right.fat),
  }
}

export function round(value: number) {
  return Number(value.toFixed(2))
}

export function normalizeMacroSplit(split: MacroSplit): MacroSplit {
  const safe = {
    protein: Math.max(0, split.protein),
    carbs: Math.max(0, split.carbs),
    fat: Math.max(0, split.fat),
  }
  const total = safe.protein + safe.carbs + safe.fat
  if (total <= 0) return defaultMacroSplit()
  return safe
}

export function macroTargetsFromCalories(
  calories: number | null | undefined,
  split: MacroSplit,
): Nutrition {
  if (!calories || calories <= 0) return emptyNutrition()
  const normalized = normalizeMacroSplit(split)
  const total = normalized.protein + normalized.carbs + normalized.fat
  return {
    calories: round(calories),
    protein: round(((calories * (normalized.protein / total)) / 4)),
    carbs: round(((calories * (normalized.carbs / total)) / 4)),
    fat: round(((calories * (normalized.fat / total)) / 9)),
  }
}

export function formatMealType(value: MealType) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatCategory(value: GroceryCategory) {
  if (value === 'fruitVeg') return 'Fruit/Veg'
  if (value === 'meatDairy') return 'Meat/Dairy'
  return 'Pantry'
}

export function getWeekStart(input: Date) {
  const date = new Date(input)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + diff)
  return toISODate(date)
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function addWeeks(isoDate: string, weeks: number) {
  return addDays(isoDate, weeks * 7)
}

export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function weekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(`${addDays(weekStart, 6)}T00:00:00`)
  const monthFormat = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  })
  return `${monthFormat.format(start)} - ${monthFormat.format(end)}`
}

export function shortDateLabel(isoDate: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${isoDate}T00:00:00`))
}
