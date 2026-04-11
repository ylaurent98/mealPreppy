import type { IngredientLine, Nutrition, RecipeVersion } from './types'
import { addNutrition, emptyNutrition, round, scaleNutrition } from './utils'

function multiplyNutrition(nutrition: Nutrition, factor: number): Nutrition {
  return {
    calories: round(nutrition.calories * factor),
    protein: round(nutrition.protein * factor),
    carbs: round(nutrition.carbs * factor),
    fat: round(nutrition.fat * factor),
  }
}

export function getIngredientLineNutrition(line: IngredientLine) {
  if (line.quantity === null || !line.unit) {
    return {
      nutrition: emptyNutrition(),
      isResolved: false,
    }
  }

  const directNutrition = line.nutritionPerUnit?.[line.unit]
  if (directNutrition) {
    return {
      nutrition: multiplyNutrition(directNutrition, line.quantity),
      isResolved: true,
    }
  }

  if (!line.nutritionPer100g) {
    return {
      nutrition: emptyNutrition(),
      isResolved: false,
    }
  }

  const gramsPerUnit =
    line.unit === 'g' ? 1 : line.unitGrams?.[line.unit]

  if (!gramsPerUnit) {
    return {
      nutrition: emptyNutrition(),
      isResolved: false,
    }
  }

  const totalGrams = line.quantity * gramsPerUnit
  return {
    nutrition: scaleNutrition(line.nutritionPer100g, totalGrams / 100),
    isResolved: true,
  }
}

export function inferIngredientIncomplete(line: IngredientLine) {
  return !getIngredientLineNutrition(line).isResolved
}

export function calculateRecipeNutrition(ingredients: IngredientLine[], servings: number) {
  return calculateScaledRecipeNutrition(ingredients, servings, 1)
}

export function calculateScaledRecipeNutrition(
  ingredients: IngredientLine[],
  servings: number,
  cookPortions: number,
) {
  const total = ingredients.reduce((sum, line) => {
    const result = getIngredientLineNutrition(line)
    return addNutrition(sum, result.nutrition)
  }, emptyNutrition())

  const unresolvedIngredients = ingredients.filter(
    (line) => inferIngredientIncomplete(line),
  ).length

  const perServing =
    servings > 0 ? scaleNutrition(total, 1 / servings) : emptyNutrition()

  const scaledTotal = scaleNutrition(
    perServing,
    cookPortions > 0 ? cookPortions : servings > 0 ? servings : 1,
  )

  return {
    total: scaledTotal,
    perServing,
    unresolvedIngredients,
  }
}

export function syncVersionNutrition(version: RecipeVersion): RecipeVersion {
  const calculated = calculateScaledRecipeNutrition(
    version.ingredients,
    version.servings,
    version.cookPortions,
  )
  return {
    ...version,
    nutritionPerServing: calculated.perServing,
    unresolvedIngredients: calculated.unresolvedIngredients,
  }
}
