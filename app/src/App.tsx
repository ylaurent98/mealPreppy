import {
  useEffect,
  useRef,
  useState,
} from 'react'
import './App.css'
import { BoxCard, ExtraCard, PlannerCard, StatCard } from './components'
import {
  cloneTemplateIntoWeek,
  createInitialState,
  remakeBoxesForVersion,
  scaleVersionServings,
  seedTemplates,
} from './seedData'
import {
  calculateScaledRecipeNutrition,
  getIngredientLineNutrition,
  inferIngredientIncomplete,
  syncVersionNutrition,
} from './nutrition'
import {
  buildDaySummary,
  buildStats,
  buildWeekSummary,
  findEntrySource,
  generateShoppingList,
} from './selectors'
import type {
  AppState,
  ExtraFood,
  GroceryCategory,
  IngredientRecord,
  IngredientLine,
  MacroSplit,
  MealType,
  RecipeTemplate,
  RecipeVersion,
  ShoppingMode,
  TabKey,
  WeekPlan,
} from './types'
import {
  addDays,
  addWeeks,
  clampFraction,
  createId,
  dayNames,
  defaultMacroSplit,
  emptyNutrition,
  formatCategory,
  formatMealType,
  macroTargetsFromCalories,
  mealTypes,
  normalizeMacroSplit,
  shortDateLabel,
  weekLabel,
} from './utils'
import {
  getCloudUserEmail,
  isCloudConfigured,
  onCloudAuthChange,
  pullCloudState,
  pushCloudState,
  signInWithPassword,
  signOutCloud,
  signUpWithPassword,
} from './cloud'

const STORAGE_KEY = 'mealpreppy-mvp-state-v2'

type DraggedItem =
  | { kind: 'box'; id: string }
  | { kind: 'extra'; id: string }
  | null

type ShoppingGroups = ReturnType<typeof generateShoppingList>
const DEFAULT_INGREDIENT_NAMES = new Set(
  seedTemplates
    .flatMap((template) => template.ingredients)
    .map((line) => line.name.trim().toLowerCase()),
)

function normalizeDailyCalorieTargets(targets?: Array<number | null>) {
  return Array.from({ length: 7 }, (_, index) => targets?.[index] ?? null)
}

function buildIngredientDbFromState(state: Pick<AppState, 'templates' | 'versions'>) {
  const byName = new Map<string, IngredientRecord>()
  const collect = (line: IngredientLine) => {
    const key = line.name.trim().toLowerCase()
    const existing = byName.get(key)
    const next: IngredientRecord = {
      id: createId('ingredientdb'),
      name: line.name,
      source: 'default',
      category: line.category,
      nutritionPer100g: line.nutritionPer100g ?? emptyNutrition(),
      unitGrams: line.unitGrams ?? { g: 1 },
      notes: line.notes,
    }
    if (!existing) {
      byName.set(key, next)
      return
    }
    const hasExistingNutrition =
      existing.nutritionPer100g.calories > 0 ||
      existing.nutritionPer100g.protein > 0 ||
      existing.nutritionPer100g.carbs > 0 ||
      existing.nutritionPer100g.fat > 0
    const hasNextNutrition =
      next.nutritionPer100g.calories > 0 ||
      next.nutritionPer100g.protein > 0 ||
      next.nutritionPer100g.carbs > 0 ||
      next.nutritionPer100g.fat > 0
    if (!hasExistingNutrition && hasNextNutrition) {
      byName.set(key, next)
    }
  }
  state.templates.forEach((template) => template.ingredients.forEach(collect))
  state.versions.forEach((version) => version.ingredients.forEach(collect))
  return Array.from(byName.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

function normalizeWeekPlan(week: WeekPlan): WeekPlan {
  return {
    ...week,
    defaultDailyCalorieTarget: week.defaultDailyCalorieTarget ?? null,
    dailyCalorieTargets: normalizeDailyCalorieTargets(week.dailyCalorieTargets),
    macroTargetPercentages: normalizeMacroSplit(
      week.macroTargetPercentages ?? defaultMacroSplit(),
    ),
  }
}

function normalizeTemplate(template: RecipeTemplate): RecipeTemplate {
  return syncTemplateNutrition({
    ...template,
    defaultCookPortions: template.defaultCookPortions ?? template.defaultServings ?? 1,
  })
}

function normalizeVersion(version: RecipeVersion): RecipeVersion {
  return syncVersionNutrition({
    ...version,
    cookPortions: version.cookPortions ?? version.servings ?? 1,
  })
}

function buildShoppingListText(weekStart: string, shoppingList: ShoppingGroups) {
  const sections = shoppingList
    .map((group) => {
      const lines = group.items.length
        ? group.items.map(
            (item) =>
              `- ${item.name}: ${item.quantityText}${item.incomplete ? ' *' : ''}`,
          )
        : ['- Nothing needed yet']

      return `${formatCategory(group.category)}\n${lines.join('\n')}`
    })
    .join('\n\n')

  return `Mealpreppy Shopping List\n${weekLabel(weekStart)}\n\n${sections}`
}

function buildShoppingListHtml(weekStart: string, shoppingList: ShoppingGroups) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const groups = shoppingList
    .map((group) => {
      const items = group.items.length
        ? group.items
            .map(
              (item) =>
                `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.quantityText)}${item.incomplete ? ' *' : ''}</strong></li>`,
            )
            .join('')
        : '<li><span>Nothing needed yet.</span></li>'

      return `
        <section class="group">
          <h2>${escapeHtml(formatCategory(group.category))}</h2>
          <ul>${items}</ul>
        </section>
      `
    })
    .join('')

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Mealpreppy Shopping List</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 32px;
            color: #1f1b17;
          }
          h1 {
            margin: 0 0 8px;
          }
          p {
            margin: 0 0 24px;
            color: #6a6058;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
          .group {
            border: 1px solid #d8c9b8;
            border-radius: 16px;
            padding: 16px;
            break-inside: avoid;
          }
          h2 {
            margin: 0 0 12px;
            font-size: 18px;
          }
          ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          li {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 6px 0;
            border-bottom: 1px solid #eee2d5;
          }
          li:last-child {
            border-bottom: 0;
          }
          strong {
            white-space: nowrap;
          }
          @media print {
            body {
              margin: 18px;
            }
          }
        </style>
      </head>
      <body>
        <h1>Mealpreppy Shopping List</h1>
        <p>${escapeHtml(weekLabel(weekStart))}</p>
        <div class="grid">${groups}</div>
      </body>
    </html>
  `
}

function buildWeekExportHtml({
  week,
  versions,
  entries,
  state,
  shoppingList,
}: {
  week: WeekPlan
  versions: RecipeVersion[]
  entries: AppState['entries']
  state: AppState
  shoppingList: ShoppingGroups
}) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const dayHeaderCells = dayNames
    .map(
      (day, dayIndex) =>
        `<th>${escapeHtml(day)}<br /><small>${escapeHtml(shortDateLabel(addDays(week.weekStart, dayIndex)))}</small></th>`,
    )
    .join('')

  const mealRows = mealTypes
    .map((mealType) => {
      const cells = dayNames
        .map((_, dayIndex) => {
          const slotEntries = entries.filter(
            (entry) => entry.dayIndex === dayIndex && entry.mealType === mealType,
          )
          const items = slotEntries
            .map((entry) => {
              const source = findEntrySource(entry, state)
              if (!source) return ''
              return `
                <article class="plan-item">
                  <strong>${escapeHtml(source.title)}</strong>
                  <span>${source.planned.calories} kcal · ${source.planned.protein}P / ${source.planned.carbs}C / ${source.planned.fat}F</span>
                </article>
              `
            })
            .join('')
          return `<td>${items || '<span class="empty-pill">-</span>'}</td>`
        })
        .join('')

      return `
        <tr>
          <th class="meal-head">${escapeHtml(formatMealType(mealType))}</th>
          ${cells}
        </tr>
      `
    })
    .join('')

  const totalsRow = dayNames
    .map((_, dayIndex) => {
      const summary = buildDaySummary(dayIndex, entries, state)
      const target = week.dailyCalorieTargets[dayIndex]
      return `
        <td>
          <div class="totals-cell">
            <strong>${summary.planned.calories} planned</strong>
            <span>${summary.consumed.calories} consumed</span>
            <small>${target === null ? 'No target' : `${Math.round(target)} target`}</small>
          </div>
        </td>
      `
    })
    .join('')

  const recipeCards = versions.length
    ? versions
        .map((version) => {
          const ingredientItems = version.ingredients
            .map((ingredient) => {
              const quantity =
                ingredient.quantity === null
                  ? 'TBD'
                  : `${ingredient.quantity}${ingredient.unit ? ` ${ingredient.unit}` : ''}`
              return `<li><span>${escapeHtml(ingredient.name)}</span><strong>${escapeHtml(quantity)}${ingredient.isIncomplete ? ' *' : ''}</strong></li>`
            })
            .join('')

          const instructionItems = version.instructions.length
            ? version.instructions
                .map((instruction) => `<li>${escapeHtml(instruction)}</li>`)
                .join('')
            : '<li>No instructions added yet.</li>'

          return `
            <article class="recipe-card">
              <header>
                <h3>${escapeHtml(version.name)}</h3>
                <p>${version.servings} portions · ${version.nutritionPerServing.calories} kcal per portion</p>
              </header>
              <div class="recipe-macros">
                <span>${version.nutritionPerServing.protein}P</span>
                <span>${version.nutritionPerServing.carbs}C</span>
                <span>${version.nutritionPerServing.fat}F</span>
              </div>
              <h4>Ingredients</h4>
              <ul class="tight-list">${ingredientItems}</ul>
              <h4>Instructions</h4>
              <ol class="steps">${instructionItems}</ol>
            </article>
          `
        })
        .join('')
    : '<p class="empty-copy">No recipe versions added for this week yet.</p>'

  const shoppingSections = shoppingList
    .map((group) => {
      const items = group.items.length
        ? group.items
            .map(
              (item) =>
                `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.quantityText)}${item.incomplete ? ' *' : ''}</strong></li>`,
            )
            .join('')
        : '<li><span>Nothing needed yet.</span></li>'

      return `
        <section class="shopping-card">
          <h3>${escapeHtml(formatCategory(group.category))}</h3>
          <ul class="tight-list">${items}</ul>
        </section>
      `
    })
    .join('')

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Mealpreppy Week Export</title>
        <style>
          :root {
            --ink: #1f1b17;
            --muted: #6a6058;
            --line: #d6c8b7;
            --paper: #fffaf2;
            --bg: #f7f0e6;
            --accent: #f06735;
            --teal: #6bd4bf;
            --lime: #c7ef63;
          }

          * {
            box-sizing: border-box;
          }

          @page {
            margin: 12mm;
            size: A4 portrait;
          }

          body {
            margin: 0;
            color: var(--ink);
            background: var(--bg);
            font-family: "Segoe UI", Arial, sans-serif;
            line-height: 1.35;
            font-size: 12px;
          }

          h1,
          h2,
          h3,
          h4 {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
          }

          p {
            margin: 0;
          }

          .cover {
            padding: 18px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(240, 103, 53, 0.18), rgba(107, 212, 191, 0.24), rgba(199, 239, 99, 0.18));
            margin-bottom: 16px;
          }

          .cover h1 {
            font-size: 28px;
            margin-bottom: 6px;
          }

          .cover p {
            color: var(--muted);
            font-size: 14px;
          }

          .section {
            margin-top: 16px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: var(--paper);
            break-inside: avoid;
          }

          .section > h2 {
            margin-bottom: 10px;
          }

          .plan-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10px;
          }

          .plan-table th,
          .plan-table td {
            border: 1px solid var(--line);
            vertical-align: top;
            padding: 6px;
          }

          .plan-table thead th {
            background: rgba(107, 212, 191, 0.2);
            text-align: left;
            font-size: 10px;
          }

          .plan-table .meal-head {
            background: rgba(240, 103, 53, 0.14);
            width: 70px;
          }

          .plan-item {
            display: grid;
            gap: 3px;
            padding: 5px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(31, 27, 23, 0.08);
            margin-bottom: 4px;
          }

          .plan-item:last-child {
            margin-bottom: 0;
          }

          .plan-item strong {
            font-size: 10px;
          }

          .plan-item span {
            color: var(--muted);
            font-size: 9px;
          }

          .empty-pill {
            color: var(--muted);
          }

          .totals-cell {
            display: grid;
            gap: 2px;
          }

          .totals-cell span,
          .totals-cell small {
            color: var(--muted);
          }

          .recipe-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .recipe-card {
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.9);
            break-inside: avoid;
            display: grid;
            gap: 8px;
          }

          .recipe-card header p {
            color: var(--muted);
            margin-top: 4px;
          }

          .recipe-macros {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .recipe-macros span {
            background: rgba(31, 27, 23, 0.06);
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 11px;
          }

          .tight-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: grid;
            gap: 4px;
          }

          .tight-list li {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            border-bottom: 1px solid #ece2d6;
            padding-bottom: 3px;
          }

          .tight-list li:last-child {
            border-bottom: 0;
            padding-bottom: 0;
          }

          .steps {
            margin: 0;
            padding-left: 18px;
            display: grid;
            gap: 4px;
          }

          .shopping-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .shopping-card {
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.92);
            break-inside: avoid;
          }

          .shopping-card h3 {
            margin-bottom: 8px;
          }

          .empty-copy {
            color: var(--muted);
          }

          .footnote {
            margin-top: 8px;
            color: var(--muted);
            font-size: 10px;
          }

          @media print {
            .section {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <header class="cover">
          <h1>Mealpreppy Weekly Pack</h1>
          <p>${escapeHtml(weekLabel(week.weekStart))}${week.title ? ` · ${escapeHtml(week.title)}` : ''}</p>
        </header>

        <section class="section">
          <h2>Weekly Plan Diagram</h2>
          <table class="plan-table">
            <thead>
              <tr>
                <th>Meal</th>
                ${dayHeaderCells}
              </tr>
            </thead>
            <tbody>
              ${mealRows}
              <tr>
                <th class="meal-head">Totals</th>
                ${totalsRow}
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>Recipes</h2>
          <div class="recipe-grid">
            ${recipeCards}
          </div>
        </section>

        <section class="section">
          <h2>Shopping List</h2>
          <div class="shopping-grid">
            ${shoppingSections}
          </div>
          <p class="footnote">Items marked with * are still partially configured.</p>
        </section>
      </body>
    </html>
  `
}

function syncTemplateNutrition(template: RecipeTemplate): RecipeTemplate {
  const calculated = calculateScaledRecipeNutrition(
    template.ingredients,
    template.defaultServings,
    template.defaultCookPortions,
  )

  return {
    ...template,
    nutritionPerServing: calculated.perServing,
  }
}

function cloneIngredientLines(lines: IngredientLine[]) {
  return lines.map((ingredient) => ({
    ...ingredient,
    id: createId('ingredient'),
    unitGrams: ingredient.unitGrams ? { ...ingredient.unitGrams } : {},
    nutritionPerUnit: ingredient.nutritionPerUnit ? { ...ingredient.nutritionPerUnit } : {},
    nutritionPer100g: ingredient.nutritionPer100g
      ? { ...ingredient.nutritionPer100g }
      : undefined,
  }))
}

function formatCalories(value: number | null | undefined) {
  if (value === null || value === undefined) return 'No target'
  return new Intl.NumberFormat(undefined).format(Math.round(value))
}

function getAvailableUnits(line: IngredientLine) {
  const units = Object.keys(line.unitGrams ?? {})
  if (!units.includes('g')) units.unshift('g')
  return units
}

function sortIngredientRecords(records: IngredientRecord[]) {
  return records
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
}

function sortIngredientLinesForRecipe(lines: IngredientLine[]) {
  const categoryOrder: Record<GroceryCategory, number> = {
    pantry: 0,
    fruitVeg: 1,
    meatDairy: 2,
  }

  return lines.slice().sort((left, right) => {
    const categoryDelta = categoryOrder[left.category] - categoryOrder[right.category]
    if (categoryDelta !== 0) return categoryDelta
    const nameDelta = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    if (nameDelta !== 0) return nameDelta
    const groupDelta = (left.group ?? '').localeCompare(right.group ?? '', undefined, { sensitivity: 'base' })
    if (groupDelta !== 0) return groupDelta
    const rawTextDelta = (left.rawText ?? '').localeCompare(right.rawText ?? '', undefined, { sensitivity: 'base' })
    if (rawTextDelta !== 0) return rawTextDelta
    return left.id.localeCompare(right.id, undefined, { sensitivity: 'base' })
  })
}

function normalizeParsedState(parsed: AppState) {
  const userIngredientDb =
    parsed.ingredientDb && parsed.ingredientDb.length > 0
      ? parsed.ingredientDb
      : buildIngredientDbFromState(parsed)
  const defaultIngredientDb = buildIngredientDbFromState({
    templates: seedTemplates,
    versions: [],
  })
  const normalizedUser = userIngredientDb.map((record) => ({
    ...record,
    source:
      record.source ??
      (DEFAULT_INGREDIENT_NAMES.has(record.name.trim().toLowerCase())
        ? 'default'
        : 'user'),
  }))
  const ingredientDb = [...normalizedUser]
  defaultIngredientDb.forEach((record) => {
    const existsDefault = ingredientDb.some(
      (item) =>
        item.source === 'default' &&
        item.name.trim().toLowerCase() === record.name.trim().toLowerCase(),
    )
    if (!existsDefault) ingredientDb.push(record)
  })
  return {
    ...parsed,
    ingredientDb,
    templates: parsed.templates.map(normalizeTemplate),
    versions: parsed.versions.map(normalizeVersion),
    weeks: parsed.weeks.map(normalizeWeekPlan),
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return createInitialState()
  try {
    return normalizeParsedState(JSON.parse(raw) as AppState)
  } catch {
    return createInitialState()
  }
}

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => state.weeks[0]?.weekStart ?? '')
  const [activeTab, setActiveTab] = useState<TabKey>('weekly')
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    () => state.weeks[0]?.recipeVersionIds[0] ?? null,
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    () => state.templates[0]?.id ?? null,
  )
  const [draggedItem, setDraggedItem] = useState<DraggedItem>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCloudBusy, setIsCloudBusy] = useState(false)
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmailInput, setAuthEmailInput] = useState('')
  const [authPasswordInput, setAuthPasswordInput] = useState('')
  const [cloudReady, setCloudReady] = useState(!isCloudConfigured)
  const [isHydratingCloud, setIsHydratingCloud] = useState(false)
  const [cloudMessage, setCloudMessage] = useState<string>(
    isCloudConfigured ? 'Sign in to sync across browsers' : 'Cloud sync not configured',
  )
  const hasBootstrappedCloud = useRef(false)
  const [quickExtra, setQuickExtra] = useState({
    ingredientName: '',
    quantity: 1,
    unit: 'g',
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!isCloudConfigured) return
    let cancelled = false

    void getCloudUserEmail()
      .then((email) => {
        if (!cancelled) setCloudUserEmail(email)
      })
      .catch((error) => {
        if (!cancelled) {
          setCloudMessage(
            `Cloud auth check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          )
        }
      })

    const unsubscribe = onCloudAuthChange((email) => {
      if (!cancelled) setCloudUserEmail(email)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isCloudConfigured) return
    let cancelled = false

    const hydrateFromCloud = async () => {
      if (!cloudUserEmail) {
        setCloudReady(true)
        setCloudMessage('Sign in to sync across browsers')
        return
      }

      try {
        setCloudReady(false)
        setIsHydratingCloud(true)
        setIsCloudBusy(true)
        const remote = await pullCloudState()
        if (cancelled) return
        if (remote) {
          const normalized = normalizeParsedState(remote)
          setState(normalized)
          setSelectedWeekStart(normalized.weeks[0]?.weekStart ?? '')
          setCloudMessage(`Loaded cloud data for ${cloudUserEmail}`)
        } else {
          setCloudMessage(`No cloud data yet for ${cloudUserEmail}. Click Sync now to upload.`)
        }
      } catch (error) {
        if (!cancelled) {
          setCloudMessage(
            `Cloud load failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          )
        }
      } finally {
        if (!cancelled) {
          setIsCloudBusy(false)
          setIsHydratingCloud(false)
          setCloudReady(true)
          hasBootstrappedCloud.current = true
        }
      }
    }

    void hydrateFromCloud()
    return () => {
      cancelled = true
    }
  }, [cloudUserEmail])

  useEffect(() => {
    if (!isCloudConfigured || !cloudReady || !cloudUserEmail || isHydratingCloud) return
    if (!hasBootstrappedCloud.current) return

    const timeout = window.setTimeout(() => {
      void pushCloudState(state)
        .then(() => {
          setCloudMessage(`Auto-synced ${new Date().toLocaleTimeString()}`)
        })
        .catch((error) => {
          setCloudMessage(
            `Auto-sync failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          )
        })
    }, 1200)

    return () => window.clearTimeout(timeout)
  }, [state, cloudReady, cloudUserEmail, isHydratingCloud])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1100) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const selectedWeek =
    state.weeks.find((week) => week.weekStart === selectedWeekStart) ?? state.weeks[0]
  const weekVersions = state.versions.filter((version) =>
    selectedWeek?.recipeVersionIds.includes(version.id),
  )
  const weekEntries = state.entries.filter((entry) =>
    selectedWeek?.entryIds.includes(entry.id),
  )
  const weekBoxes = state.boxes.filter((box) => selectedWeek?.boxIds.includes(box.id))
  const weekExtras = state.extras.filter((extra) => selectedWeek?.extraFoodIds.includes(extra.id))
  const selectedVersion =
    state.versions.find((version) => version.id === selectedVersionId) ?? weekVersions[0] ?? null
  const selectedTemplate =
    state.templates.find((template) => template.id === selectedTemplateId) ?? state.templates[0] ?? null
  const unassignedBoxes = weekBoxes.filter(
    (box) => !weekEntries.some((entry) => entry.sourceType === 'box' && entry.sourceId === box.id),
  )
  const unassignedExtras = weekExtras.filter(
    (extra) => !weekEntries.some((entry) => entry.sourceType === 'extra' && entry.sourceId === extra.id),
  )
  const shoppingList = selectedWeek
    ? generateShoppingList(selectedWeek, state, weekVersions, weekEntries)
    : []
  const stats = buildStats(state)
  const ingredientDb = state.ingredientDb
  const sortedIngredientDb = sortIngredientRecords(ingredientDb)
  const selectedQuickExtraIngredient =
    ingredientDb.find((item) => item.name === quickExtra.ingredientName) ?? null
  const quickExtraUnits = selectedQuickExtraIngredient
    ? Array.from(
        new Set([
          ...Object.keys(selectedQuickExtraIngredient.unitGrams ?? {}),
          'g',
        ]),
      )
    : ['g']

  function updateState(updater: (draft: AppState) => AppState) {
    setState((current) => updater(current))
  }

  async function syncToCloudNow() {
    if (!isCloudConfigured) return
    try {
      setIsCloudBusy(true)
      await pushCloudState(state)
      setCloudMessage(`Synced ${new Date().toLocaleTimeString()}`)
    } catch (error) {
      setCloudMessage(
        `Cloud sync failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      setIsCloudBusy(false)
    }
  }

  async function authenticateWithPassword() {
    if (!authEmailInput.trim() || !authPasswordInput.trim()) return
    try {
      setIsCloudBusy(true)
      if (authMode === 'signup') {
        await signUpWithPassword(authEmailInput.trim(), authPasswordInput)
        setCloudMessage('Account created. You are now signed in.')
      } else {
        await signInWithPassword(authEmailInput.trim(), authPasswordInput)
        setCloudMessage('Signed in successfully.')
      }
    } catch (error) {
      setCloudMessage(
        `Login failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      setIsCloudBusy(false)
    }
  }

  async function signOutFromCloud() {
    try {
      setIsCloudBusy(true)
      await signOutCloud()
      setCloudUserEmail(null)
      setCloudMessage('Signed out from cloud')
    } catch (error) {
      setCloudMessage(
        `Sign out failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      setIsCloudBusy(false)
    }
  }

  function findIngredientRecordByName(name: string) {
    return ingredientDb.find(
      (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
    )
  }

  function applyIngredientRecord(line: IngredientLine, record: IngredientRecord) {
    const availableUnits = Object.keys(record.unitGrams)
    const nextUnit =
      line.unit && availableUnits.includes(line.unit)
        ? line.unit
        : availableUnits.includes('g')
          ? 'g'
          : availableUnits[0] ?? line.unit
    return {
      ...line,
      name: record.name,
      category: record.category,
      unit: nextUnit ?? null,
      nutritionPer100g: record.nutritionPer100g,
      unitGrams: record.unitGrams,
      notes: line.notes ?? record.notes,
    }
  }

  function ensureWeek(weekStart: string) {
    updateState((current) => {
      if (current.weeks.some((week) => week.weekStart === weekStart)) return current
      const newWeek: WeekPlan = {
        weekStart,
        title: 'New Meal Prep Week',
        recipeVersionIds: [],
        boxIds: [],
        entryIds: [],
        extraFoodIds: [],
        shoppingMode: 'assigned',
        defaultDailyCalorieTarget: null,
        dailyCalorieTargets: Array.from({ length: 7 }, () => null),
        macroTargetPercentages: defaultMacroSplit(),
        notes: '',
      }
      return {
        ...current,
        weeks: [...current.weeks, newWeek].sort((left, right) =>
          left.weekStart > right.weekStart ? -1 : 1,
        ),
      }
    })
  }

  function goToWeek(weekStart: string) {
    ensureWeek(weekStart)
    setSelectedWeekStart(weekStart)
    setActiveTab('weekly')
    setIsSidebarOpen(false)
  }

  function addVersion(template: RecipeTemplate) {
    if (!selectedWeek) return
    const version = cloneTemplateIntoWeek(template, selectedWeek.weekStart)
    updateState((current) => ({
      ...current,
      versions: [version, ...current.versions],
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? { ...week, recipeVersionIds: [version.id, ...week.recipeVersionIds] }
          : week,
      ),
    }))
    setSelectedVersionId(version.id)
    setActiveTab('weekly')
  }

  function updateTemplate(
    templateId: string,
    updater: (template: RecipeTemplate) => RecipeTemplate,
  ) {
    updateState((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.id === templateId ? syncTemplateNutrition(updater(template)) : template,
      ),
    }))
  }

  function updateTemplateIngredient(
    templateId: string,
    lineId: string,
    patch: Partial<IngredientLine>,
  ) {
    updateTemplate(templateId, (template) => ({
      ...template,
      ingredients: template.ingredients.map((ingredient) =>
        ingredient.id === lineId
          ? (() => {
              const patched = { ...ingredient, ...patch }
              const matched = patched.name ? findIngredientRecordByName(patched.name) : null
              const nextIngredient = matched
                ? applyIngredientRecord(patched, matched)
                : patched
              return {
                ...nextIngredient,
                isIncomplete: inferIngredientIncomplete(nextIngredient),
              }
            })()
          : ingredient,
      ),
    }))
  }

  function addIngredientToTemplate(templateId: string) {
    updateTemplate(templateId, (template) => ({
      ...template,
      ingredients: [
        ...template.ingredients,
        {
          id: createId('ingredient'),
          group: 'main',
          name: '',
          rawText: '',
          quantity: null,
          unit: null,
          category: 'pantry',
          nutritionPer100g: emptyNutrition(),
          unitGrams: {},
          nutritionPerUnit: {},
          notes: '',
          isIncomplete: true,
        },
      ],
    }))
  }

  function removeIngredientFromTemplate(templateId: string, lineId: string) {
    updateTemplate(templateId, (template) => ({
      ...template,
      ingredients: template.ingredients.filter((ingredient) => ingredient.id !== lineId),
    }))
  }

  function createIngredientRecord(draft: Omit<IngredientRecord, 'id' | 'source'>) {
    const fresh: IngredientRecord = {
      id: createId('ingredientdb'),
      name: draft.name.trim(),
      source: 'user',
      category: draft.category,
      nutritionPer100g: draft.nutritionPer100g,
      unitGrams: {
        ...draft.unitGrams,
        g: 1,
      },
      notes: draft.notes,
    }
    updateState((current) => ({
      ...current,
      ingredientDb: [fresh, ...current.ingredientDb],
    }))
  }

  function restoreDefaultIngredientLibrary() {
    updateState((current) => {
      const defaults = buildIngredientDbFromState({
        templates: seedTemplates,
        versions: [],
      })
      const merged = [...current.ingredientDb]
      defaults.forEach((record) => {
        const hasDefault = merged.some(
          (item) =>
            item.source === 'default' &&
            item.name.trim().toLowerCase() === record.name.trim().toLowerCase(),
        )
        if (!hasDefault) {
          merged.push({
            ...record,
            source: 'default',
          })
        }
      })
      return {
        ...current,
        ingredientDb: sortIngredientRecords(merged),
      }
    })
  }

  function updateIngredientRecord(
    recordId: string,
    updater: (record: IngredientRecord) => IngredientRecord,
  ) {
    updateState((current) => {
      const previous = current.ingredientDb.find((record) => record.id === recordId)
      if (!previous) return current
      const updated = updater(previous)
      const sameName = (name: string) =>
        name.trim().toLowerCase() === previous.name.trim().toLowerCase()

      const applyToLine = (line: IngredientLine) => {
        if (!sameName(line.name)) return line
        return {
          ...line,
          name: updated.name,
          category: updated.category,
          nutritionPer100g: updated.nutritionPer100g,
          unitGrams: updated.unitGrams,
          isIncomplete: inferIngredientIncomplete({
            ...line,
            name: updated.name,
            category: updated.category,
            nutritionPer100g: updated.nutritionPer100g,
            unitGrams: updated.unitGrams,
          }),
        }
      }

      return {
        ...current,
        ingredientDb: current.ingredientDb.map((record) =>
          record.id === recordId ? updated : record,
        ),
        templates: current.templates.map((template) =>
          syncTemplateNutrition({
            ...template,
            ingredients: template.ingredients.map(applyToLine),
          }),
        ),
        versions: current.versions.map((version) =>
          syncVersionNutrition({
            ...version,
            ingredients: version.ingredients.map(applyToLine),
          }),
        ),
      }
    })
  }

  function saveTemplateAsNewDefault(template: RecipeTemplate) {
    const nextName = window.prompt('Name for the new default recipe version:', `${template.name} Copy`)
    if (!nextName?.trim()) return

    const newTemplate = syncTemplateNutrition({
      ...template,
      id: createId('template'),
      name: nextName.trim(),
      ingredients: cloneIngredientLines(template.ingredients),
      instructions: [...template.instructions],
      tags: [...template.tags],
    })

    updateState((current) => ({
      ...current,
      templates: [newTemplate, ...current.templates],
    }))
    setSelectedTemplateId(newTemplate.id)
    setActiveTab('recipes')
  }

  function saveVersionAsNewDefault(version: RecipeVersion) {
    const nextName = window.prompt('Name for the new default recipe version:', version.name)
    if (!nextName?.trim()) return

    const newTemplate = syncTemplateNutrition({
      id: createId('template'),
      name: nextName.trim(),
      description: `Saved from ${weekLabel(version.weekStart)}`,
      defaultServings: version.servings,
      defaultCookPortions: version.cookPortions ?? version.servings,
      mealType: version.mealType,
      nutritionSource: 'calculated',
      nutritionPerServing: version.nutritionPerServing,
      instructions: [...version.instructions],
      tags: ['Saved default'],
      notes: version.notes,
      ingredients: cloneIngredientLines(version.ingredients),
    })

    updateState((current) => ({
      ...current,
      templates: [newTemplate, ...current.templates],
    }))
    setSelectedTemplateId(newTemplate.id)
    setActiveTab('recipes')
  }

  function updateVersion(versionId: string, updater: (version: RecipeVersion) => RecipeVersion) {
    updateState((current) => ({
      ...current,
      versions: current.versions.map((version) =>
        version.id === versionId ? updater(version) : version,
      ),
    }))
  }

  function reloadVersionFromTemplate(versionId: string) {
    const targetVersion = state.versions.find((version) => version.id === versionId)
    if (!targetVersion) return
    const sourceTemplate = state.templates.find((template) => template.id === targetVersion.templateId)
    if (!sourceTemplate) {
      window.alert('Default recipe template was not found for this version.')
      return
    }

    const hasMadeBoxes = state.boxes.some((box) => box.recipeVersionId === versionId)
    const confirmed = window.confirm(
      hasMadeBoxes
        ? 'Reload default recipe for this week? This will discard edits and remove made boxes for this version.'
        : 'Reload default recipe for this week? This will discard edits on this dated version.',
    )
    if (!confirmed) return

    updateState((current) => {
      const currentVersion = current.versions.find((version) => version.id === versionId)
      if (!currentVersion) return current
      const template = current.templates.find((item) => item.id === currentVersion.templateId)
      if (!template) return current

      const versionBoxIds = new Set(
        current.boxes
          .filter((box) => box.recipeVersionId === versionId)
          .map((box) => box.id),
      )

      return {
        ...current,
        boxes: current.boxes.filter((box) => box.recipeVersionId !== versionId),
        entries: current.entries.filter(
          (entry) => !(entry.sourceType === 'box' && versionBoxIds.has(entry.sourceId)),
        ),
        weeks: current.weeks.map((week) =>
          week.weekStart === currentVersion.weekStart
            ? {
                ...week,
                boxIds: week.boxIds.filter((boxId) => !versionBoxIds.has(boxId)),
                entryIds: week.entryIds.filter((entryId) => {
                  const entry = current.entries.find((item) => item.id === entryId)
                  return !(entry && entry.sourceType === 'box' && versionBoxIds.has(entry.sourceId))
                }),
              }
            : week,
        ),
        versions: current.versions.map((version) =>
          version.id === versionId
            ? syncVersionNutrition({
                ...version,
                name: template.name,
                servings: template.defaultServings,
                cookPortions: template.defaultCookPortions,
                notes: template.notes ?? '',
                instructions: [...template.instructions],
                ingredients: cloneIngredientLines(template.ingredients),
                updatedAt: new Date().toISOString(),
                lastMadeAt: undefined,
              })
            : version,
        ),
      }
    })
  }

  function updateIngredient(versionId: string, lineId: string, patch: Partial<IngredientLine>) {
    updateVersion(versionId, (version) => ({
      ...syncVersionNutrition({
        ...version,
        ingredients: version.ingredients.map((ingredient) =>
          ingredient.id === lineId
            ? (() => {
                const patched = { ...ingredient, ...patch }
                const matched = patched.name ? findIngredientRecordByName(patched.name) : null
                const nextIngredient = matched
                  ? applyIngredientRecord(patched, matched)
                  : patched
                return {
                  ...nextIngredient,
                  isIncomplete: inferIngredientIncomplete(nextIngredient),
                }
              })()
            : ingredient,
        ),
        updatedAt: new Date().toISOString(),
      }),
    }))
  }

  function addIngredientToVersion(versionId: string) {
    updateVersion(versionId, (version) =>
      syncVersionNutrition({
        ...version,
        ingredients: [
          ...version.ingredients,
          {
            id: createId('ingredient'),
            group: 'main',
            name: '',
            rawText: '',
            quantity: null,
            unit: null,
            category: 'pantry',
            nutritionPer100g: emptyNutrition(),
            unitGrams: {},
            nutritionPerUnit: {},
            notes: '',
            isIncomplete: true,
          },
        ],
        updatedAt: new Date().toISOString(),
      }),
    )
  }

  function removeIngredientFromVersion(versionId: string, lineId: string) {
    updateVersion(versionId, (version) =>
      syncVersionNutrition({
        ...version,
        ingredients: version.ingredients.filter((ingredient) => ingredient.id !== lineId),
        updatedAt: new Date().toISOString(),
      }),
    )
  }

  function handleMake(version: RecipeVersion) {
    const made = remakeBoxesForVersion(version)
    updateState((current) => ({
      ...current,
      boxes: [...current.boxes.filter((box) => box.recipeVersionId !== version.id), ...made.boxes],
      entries: current.entries.filter((entry) => {
        if (entry.sourceType !== 'box') return true
        const linked = current.boxes.find((box) => box.id === entry.sourceId)
        return linked?.recipeVersionId !== version.id
      }),
      weeks: current.weeks.map((week) =>
        week.weekStart === version.weekStart
          ? {
              ...week,
              boxIds: [
                ...week.boxIds.filter((boxId) => {
                  const linked = current.boxes.find((box) => box.id === boxId)
                  return linked?.recipeVersionId !== version.id
                }),
                ...made.boxes.map((box) => box.id),
              ],
              entryIds: week.entryIds.filter((entryId) => {
                const entry = current.entries.find((item) => item.id === entryId)
                if (!entry || entry.sourceType !== 'box') return true
                const linked = current.boxes.find((box) => box.id === entry.sourceId)
                return linked?.recipeVersionId !== version.id
              }),
            }
          : week,
      ),
      versions: current.versions.map((item) =>
        item.id === version.id
          ? {
              ...item,
              lastMadeAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }))
  }

  function assignBox(boxId: string, dayIndex: number, mealType: MealType) {
    if (!selectedWeek) return
    updateState((current) => {
      const existing = current.entries.find(
        (entry) =>
          entry.weekStart === selectedWeek.weekStart &&
          entry.sourceType === 'box' &&
          entry.sourceId === boxId,
      )
      const nextEntry =
        existing ??
        {
          id: createId('entry'),
          weekStart: selectedWeek.weekStart,
          dayIndex,
          mealType,
          sourceType: 'box' as const,
          sourceId: boxId,
          consumedFraction: 1,
          createdAt: new Date().toISOString(),
        }

      return {
        ...current,
        entries: existing
          ? current.entries.map((entry) =>
              entry.id === existing.id ? { ...entry, dayIndex, mealType } : entry,
            )
          : [...current.entries, nextEntry],
        weeks: current.weeks.map((week) =>
          week.weekStart === selectedWeek.weekStart && !week.entryIds.includes(nextEntry.id)
            ? { ...week, entryIds: [...week.entryIds, nextEntry.id] }
            : week,
        ),
      }
    })
  }

  function assignExtra(extraId: string, dayIndex: number, mealType: MealType) {
    if (!selectedWeek) return
    updateState((current) => {
      const existing = current.entries.find(
        (entry) =>
          entry.weekStart === selectedWeek.weekStart &&
          entry.sourceType === 'extra' &&
          entry.sourceId === extraId,
      )

      const nextEntry =
        existing ??
        {
          id: createId('entry'),
          weekStart: selectedWeek.weekStart,
          dayIndex,
          mealType,
          sourceType: 'extra' as const,
          sourceId: extraId,
          consumedFraction: 1,
          createdAt: new Date().toISOString(),
        }

      return {
        ...current,
        entries: existing
          ? current.entries.map((entry) =>
              entry.id === existing.id ? { ...entry, dayIndex, mealType } : entry,
            )
          : [...current.entries, nextEntry],
        weeks: current.weeks.map((week) =>
          week.weekStart === selectedWeek.weekStart && !week.entryIds.includes(nextEntry.id)
            ? { ...week, entryIds: [...week.entryIds, nextEntry.id] }
            : week,
        ),
      }
    })
  }

  function removeEntry(entryId: string) {
    if (!selectedWeek) return
    updateState((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== entryId),
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? { ...week, entryIds: week.entryIds.filter((id) => id !== entryId) }
          : week,
      ),
    }))
  }

  function deleteBatchForVersion(versionId: string) {
    if (!selectedWeek) return
    const shouldDelete = window.confirm(
      'Delete the whole made batch for this recipe version? This only works when all boxes are unassigned.',
    )

    if (!shouldDelete) return

    updateState((current) => {
      const versionBoxes = current.boxes.filter((box) => box.recipeVersionId === versionId)
      const versionBoxIds = new Set(versionBoxes.map((box) => box.id))
      const assignedEntries = current.entries.filter(
        (entry) => entry.sourceType === 'box' && versionBoxIds.has(entry.sourceId),
      )

      if (assignedEntries.length > 0) {
        return current
      }

      return {
        ...current,
        boxes: current.boxes.filter((box) => !versionBoxIds.has(box.id)),
        weeks: current.weeks.map((week) =>
          week.weekStart === selectedWeek.weekStart
            ? {
                ...week,
                boxIds: week.boxIds.filter((boxId) => !versionBoxIds.has(boxId)),
              }
            : week,
        ),
        versions: current.versions.map((version) =>
          version.id === versionId
            ? { ...version, lastMadeAt: undefined, updatedAt: new Date().toISOString() }
            : version,
        ),
      }
    })

  }

  function deleteExtra(extraId: string) {
    if (!selectedWeek) return

    const isAssigned = weekEntries.some(
      (entry) => entry.sourceType === 'extra' && entry.sourceId === extraId,
    )

    if (isAssigned) return

    const shouldDelete = window.confirm('Delete this unassigned extra snack?')
    if (!shouldDelete) return

    updateState((current) => ({
      ...current,
      extras: current.extras.filter((extra) => extra.id !== extraId),
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? {
              ...week,
              extraFoodIds: week.extraFoodIds.filter((id) => id !== extraId),
            }
          : week,
      ),
    }))
  }

  function hardResetWeek(weekStart: string) {
    const shouldReset = window.confirm(
      `Hard reset ${weekLabel(weekStart)}? This will remove all recipe versions, made boxes, extras, and planner entries for that week.`,
    )

    if (!shouldReset) return

    updateState((current) => ({
      ...current,
      versions: current.versions.filter((version) => version.weekStart !== weekStart),
      boxes: current.boxes.filter((box) => box.weekStart !== weekStart),
      extras: current.extras.filter((extra) => extra.weekStart !== weekStart),
      entries: current.entries.filter((entry) => entry.weekStart !== weekStart),
      weeks: current.weeks.map((week) =>
        week.weekStart === weekStart
          ? {
              ...week,
              title: 'Reset Meal Prep Week',
              recipeVersionIds: [],
              boxIds: [],
              entryIds: [],
              extraFoodIds: [],
              shoppingMode: 'assigned',
              defaultDailyCalorieTarget: null,
              dailyCalorieTargets: Array.from({ length: 7 }, () => null),
              macroTargetPercentages: defaultMacroSplit(),
              notes: '',
            }
          : week,
      ),
    }))

    setSelectedVersionId(null)
    setDraggedItem(null)
  }

  function updateBoxFraction(boxId: string, fraction: number) {
    updateState((current) => {
      const target = current.boxes.find((box) => box.id === boxId)
      if (!target) return current

      if (fraction === 0.5 && target.portionFraction >= 1) {
        const sibling: AppState['boxes'][number] = {
          ...target,
          id: createId('box'),
          boxNumber:
            Math.max(
              0,
              ...current.boxes
                .filter((box) => box.recipeVersionId === target.recipeVersionId)
                .map((box) => box.boxNumber),
            ) + 1,
          portionFraction: 0.5,
          createdAt: new Date().toISOString(),
        }

        const existingEntry = current.entries.find(
          (entry) => entry.sourceType === 'box' && entry.sourceId === target.id,
        )
        const siblingEntry = existingEntry
          ? {
              ...existingEntry,
              id: createId('entry'),
              sourceId: sibling.id,
              createdAt: new Date().toISOString(),
            }
          : null

        return {
          ...current,
          boxes: current.boxes
            .map((box) => (box.id === boxId ? { ...box, portionFraction: 0.5 } : box))
            .concat(sibling),
          entries: siblingEntry ? [...current.entries, siblingEntry] : current.entries,
          weeks: current.weeks.map((week) =>
            week.weekStart === target.weekStart
              ? {
                  ...week,
                  boxIds: [...week.boxIds, sibling.id],
                  entryIds:
                    siblingEntry && !week.entryIds.includes(siblingEntry.id)
                      ? [...week.entryIds, siblingEntry.id]
                      : week.entryIds,
                }
              : week,
          ),
        }
      }

      return {
        ...current,
        boxes: current.boxes.map((box) =>
          box.id === boxId ? { ...box, portionFraction: clampFraction(fraction) } : box,
        ),
      }
    })
  }

  function addQuickExtra() {
    if (!selectedWeek || !quickExtra.ingredientName.trim()) return
    const record = ingredientDb.find((item) => item.name === quickExtra.ingredientName)
    if (!record) return

    const lineNutrition = getIngredientLineNutrition({
      id: createId('ingredient'),
      group: 'extra',
      name: record.name,
      rawText: '',
      quantity: quickExtra.quantity,
      unit: quickExtra.unit,
      category: record.category,
      nutritionPer100g: record.nutritionPer100g,
      unitGrams: record.unitGrams,
      nutritionPerUnit: {},
      notes: record.notes,
    })

    if (!lineNutrition.isResolved) {
      window.alert('This extra ingredient is missing a usable unit conversion in Ingredient DB.')
      return
    }

    const extra: ExtraFood = {
      id: createId('extra'),
      weekStart: selectedWeek.weekStart,
      name: `${record.name} (${quickExtra.quantity}${quickExtra.unit ? ` ${quickExtra.unit}` : ''})`,
      mealType: 'snack',
      nutrition: lineNutrition.nutrition,
      createdAt: new Date().toISOString(),
    }

    updateState((current) => ({
      ...current,
      extras: [...current.extras, extra],
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? {
              ...week,
              extraFoodIds: [...week.extraFoodIds, extra.id],
            }
          : week,
      ),
    }))
    setQuickExtra((current) => ({ ...current, ingredientName: '' }))
  }

  function updateShoppingMode(mode: ShoppingMode) {
    if (!selectedWeek) return
    updateState((current) => ({
      ...current,
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart ? { ...week, shoppingMode: mode } : week,
      ),
    }))
  }

  function updateDayCalorieTarget(dayIndex: number, value: number | null) {
    if (!selectedWeek) return
    updateState((current) => ({
      ...current,
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? {
              ...week,
              dailyCalorieTargets: week.dailyCalorieTargets.map((target, index) =>
                index === dayIndex ? value : target,
              ),
            }
          : week,
      ),
    }))
  }

  function updateDefaultDailyCalorieTarget(value: number | null) {
    if (!selectedWeek) return
    updateState((current) => ({
      ...current,
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? {
              ...week,
              defaultDailyCalorieTarget: value,
            }
          : week,
      ),
    }))
  }

  function applyDefaultDailyCalorieTarget() {
    if (!selectedWeek) return
    updateState((current) => ({
      ...current,
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? {
              ...week,
              dailyCalorieTargets: Array.from(
                { length: 7 },
                () => week.defaultDailyCalorieTarget,
              ),
            }
          : week,
      ),
    }))
  }

  function updateMacroTargetSplit(split: MacroSplit) {
    if (!selectedWeek) return
    const safeProtein = Math.max(0, Math.min(100, Math.round(split.protein)))
    const safeCarbs = Math.max(0, Math.min(100, Math.round(split.carbs)))
    const safeFat = Math.max(0, Math.min(100, Math.round(split.fat)))
    const total = safeProtein + safeCarbs + safeFat
    const normalized =
      total === 100
        ? { protein: safeProtein, carbs: safeCarbs, fat: safeFat }
        : (() => {
            if (total <= 0) return defaultMacroSplit()
            const protein = Math.round((safeProtein / total) * 100)
            const carbs = Math.round((safeCarbs / total) * 100)
            const fat = Math.max(0, 100 - protein - carbs)
            return { protein, carbs, fat }
          })()

    updateState((current) => ({
      ...current,
      weeks: current.weeks.map((week) =>
        week.weekStart === selectedWeek.weekStart
          ? {
              ...week,
              macroTargetPercentages: normalized,
            }
          : week,
      ),
    }))
  }

  async function copyShoppingList() {
    if (!selectedWeek) return
    const text = buildShoppingListText(selectedWeek.weekStart, shoppingList)
    try {
      await navigator.clipboard.writeText(text)
      window.alert('Shopping list copied to clipboard.')
    } catch {
      window.alert('Clipboard copy was blocked in this browser.')
    }
  }

  function exportShoppingListPdf() {
    if (!selectedWeek) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      window.alert('Please allow pop-ups so the PDF export can open.')
      return
    }

    printWindow.document.write(buildShoppingListHtml(selectedWeek.weekStart, shoppingList))
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  function exportWeekPdf() {
    if (!selectedWeek) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      window.alert('Please allow pop-ups so the PDF export can open.')
      return
    }

    printWindow.document.write(
      buildWeekExportHtml({
        week: selectedWeek,
        versions: weekVersions,
        entries: weekEntries,
        state,
        shoppingList,
      }),
    )
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className={isSidebarOpen ? 'shell sidebar-open' : 'shell'}>
      <aside className={isSidebarOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">MP</div>
          <div>
            <p className="eyebrow">Funky meal prep OS</p>
            <h1>Mealpreppy</h1>
          </div>
        </div>

        <nav className="nav">
          {(['weekly', 'recipes', 'ingredients', 'calendar', 'stats'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? 'nav-link active' : 'nav-link'}
              onClick={() => {
                setActiveTab(tab)
                setIsSidebarOpen(false)
              }}
            >
              {tab === 'weekly'
                ? 'Weekly Prep'
                : tab === 'ingredients'
                  ? 'Ingredients DB'
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <section className="sidebar-panel compact-week-panel">
          <div className="panel-header">
            <h2>Week</h2>
            <input
              type="date"
              value={selectedWeekStart}
              onChange={(event) => goToWeek(event.target.value)}
            />
          </div>
          <div className="week-switcher">
            <button onClick={() => goToWeek(addWeeks(selectedWeekStart, -1))}>Prev</button>
            <button onClick={() => goToWeek(addWeeks(selectedWeekStart, 1))}>Next</button>
          </div>
        </section>

        <section className="sidebar-panel compact-week-panel">
          <div className="panel-header">
            <h2>Cloud</h2>
          </div>
          {!isCloudConfigured ? (
            <p className="muted">Add Supabase env vars to enable cloud sync.</p>
          ) : cloudUserEmail ? (
            <>
              <p className="muted">{cloudUserEmail}</p>
              <button
                className="secondary-button"
                disabled={isCloudBusy}
                onClick={() => {
                  void syncToCloudNow()
                }}
              >
                {isCloudBusy ? 'Syncing...' : 'Sync now'}
              </button>
              <button
                className="secondary-button"
                disabled={isCloudBusy}
                onClick={() => {
                  void signOutFromCloud()
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="action-row">
                <button
                  className={authMode === 'signin' ? 'secondary-button' : ''}
                  disabled={isCloudBusy}
                  onClick={() => setAuthMode('signin')}
                >
                  Sign in
                </button>
                <button
                  className={authMode === 'signup' ? 'secondary-button' : ''}
                  disabled={isCloudBusy}
                  onClick={() => setAuthMode('signup')}
                >
                  Sign up
                </button>
              </div>
              <label>
                Email
                <input
                  type="email"
                  value={authEmailInput}
                  placeholder="you@example.com"
                  onChange={(event) => setAuthEmailInput(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={authPasswordInput}
                  placeholder="At least 6 characters"
                  onChange={(event) => setAuthPasswordInput(event.target.value)}
                />
              </label>
              <button
                className="secondary-button"
                disabled={isCloudBusy || !authEmailInput.trim() || !authPasswordInput.trim()}
                onClick={() => {
                  void authenticateWithPassword()
                }}
              >
                {authMode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </>
          )}
          <p className="muted">{cloudMessage}</p>
        </section>

        {activeTab === 'weekly' && selectedWeek ? (
          <section className="sidebar-panel quick-extra-sidebar">
            <div className="panel-header">
              <h2>Quick Extra</h2>
            </div>
            <label>
              Ingredient
              <select
                value={quickExtra.ingredientName}
                onChange={(event) => {
                  const selected = ingredientDb.find((item) => item.name === event.target.value)
                  const defaultUnit = selected?.unitGrams.g ? 'g' : Object.keys(selected?.unitGrams ?? {})[0] ?? 'g'
                  setQuickExtra((current) => ({
                    ...current,
                    ingredientName: event.target.value,
                    unit: defaultUnit,
                  }))
                }}
              >
                <option value="">Select ingredient</option>
                {sortedIngredientDb.map((record) => (
                  <option key={record.id} value={record.name}>
                    {record.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="quick-extra-controls">
              <input
                type="number"
                min={0}
                value={quickExtra.quantity}
                placeholder="Qty"
                onChange={(event) =>
                  setQuickExtra((current) => ({
                    ...current,
                    quantity: event.target.value === '' ? 0 : Number(event.target.value),
                  }))
                }
              />
              <select
                value={quickExtra.unit}
                onChange={(event) =>
                  setQuickExtra((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
              >
                {quickExtraUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={addQuickExtra}>Add extra</button>
          </section>
        ) : null}

        {activeTab === 'weekly' && selectedWeek ? (
          <section className="sidebar-panel compact-week-panel">
            <div className="panel-header">
              <h2>Week Reset</h2>
            </div>
            <button
              className="danger-button"
              onClick={() => hardResetWeek(selectedWeek.weekStart)}
            >
              Hard reset week
            </button>
          </section>
        ) : null}

      </aside>

      <main className="main">
        <div className="mobile-topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-label="Toggle menu"
          >
            &#9776;
          </button>
        </div>
        <header className="hero">
          <div>
            <p className="eyebrow">Meal planning, versioned</p>
            <h2>Prep once, keep every week historically accurate</h2>
            <p className="hero-copy">
              Default recipes stay reusable. Weekly versions stay dated. Boxes stay draggable.
              Shopping lists stay grouped for the store.
            </p>
          </div>
          <div className="hero-badges">
            <span>Versioned Recipes</span>
            <span>Box Planner</span>
            <span>Shopping List</span>
            <span>History Calendar</span>
          </div>
        </header>

        {activeTab === 'weekly' && selectedWeek ? (
          <WeeklyTab
            state={state}
            selectedWeek={selectedWeek}
            weekVersions={weekVersions}
            weekEntries={weekEntries}
            selectedVersion={selectedVersion}
            shoppingList={shoppingList}
            ingredientDb={ingredientDb}
            onSelectVersion={setSelectedVersionId}
            onUpdateVersion={updateVersion}
            onUpdateIngredient={updateIngredient}
            onAddIngredientToVersion={addIngredientToVersion}
            onRemoveIngredientFromVersion={removeIngredientFromVersion}
            onOpenIngredientDb={() => setActiveTab('ingredients')}
            onHandleMake={handleMake}
            onReloadVersionFromTemplate={reloadVersionFromTemplate}
            onSaveVersionAsNewDefault={saveVersionAsNewDefault}
            onVersionServings={(version, servings) =>
              updateVersion(version.id, (current) => scaleVersionServings(current, servings))
            }
            unassignedBoxes={unassignedBoxes}
            unassignedExtras={unassignedExtras}
            onAssignBox={assignBox}
            onAssignExtra={assignExtra}
            draggedItem={draggedItem}
            onSetDraggedItem={setDraggedItem}
            onClearDraggedItem={() => setDraggedItem(null)}
            onRemoveEntry={removeEntry}
            onUpdateBoxFraction={updateBoxFraction}
            onUpdateShoppingMode={updateShoppingMode}
            onUpdateDayCalorieTarget={updateDayCalorieTarget}
            onUpdateDefaultDailyCalorieTarget={updateDefaultDailyCalorieTarget}
            onApplyDefaultDailyCalorieTarget={applyDefaultDailyCalorieTarget}
            onUpdateMacroTargetSplit={updateMacroTargetSplit}
            onCopyShoppingList={copyShoppingList}
            onExportShoppingListPdf={exportShoppingListPdf}
            onExportWeekPdf={exportWeekPdf}
            onDeleteExtra={deleteExtra}
            onDeleteBatchForVersion={deleteBatchForVersion}
          />
        ) : null}

        {activeTab === 'recipes' ? (
          <RecipesTab
            templates={state.templates}
            selectedTemplate={selectedTemplate}
            ingredientDb={ingredientDb}
            selectedWeekStart={selectedWeekStart}
            onSelectTemplate={setSelectedTemplateId}
            onUpdateTemplate={updateTemplate}
            onUpdateTemplateIngredient={updateTemplateIngredient}
            onAddIngredientToTemplate={addIngredientToTemplate}
            onRemoveIngredientFromTemplate={removeIngredientFromTemplate}
            onOpenIngredientDb={() => setActiveTab('ingredients')}
            onSaveTemplateAsNewDefault={saveTemplateAsNewDefault}
            onAddVersion={addVersion}
          />
        ) : null}

        {activeTab === 'ingredients' ? (
          <IngredientDbTab
            ingredientDb={ingredientDb}
            onCreateIngredientRecord={createIngredientRecord}
            onUpdateIngredientRecord={updateIngredientRecord}
            onRestoreDefaults={restoreDefaultIngredientLibrary}
          />
        ) : null}

        {activeTab === 'calendar' ? (
          <CalendarTab
            state={state}
            selectedWeekStart={selectedWeekStart}
            onOpenWeek={(weekStart) => {
              setSelectedWeekStart(weekStart)
              setActiveTab('weekly')
            }}
          />
        ) : null}

        {activeTab === 'stats' ? <StatsTab stats={stats} /> : null}
      </main>
      {isSidebarOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
    </div>
  )
}

function MacroSplitSlider({
  split,
  onChange,
}: {
  split: MacroSplit
  onChange: (split: MacroSplit) => void
}) {
  const protein = Math.max(0, Math.min(100, split.protein))
  const carbs = Math.max(0, Math.min(100 - protein, split.carbs))
  const fat = Math.max(0, 100 - protein - carbs)
  const boundaryOne = protein
  const boundaryTwo = protein + carbs

  return (
    <div className="macro-slider">
      <div className="macro-slider-header">
        <span className="muted">Macro split %</span>
        <strong>{protein + carbs + fat}%</strong>
      </div>
      <div className="macro-slider-track">
        <div className="macro-segment protein" style={{ width: `${protein}%` }} />
        <div className="macro-segment carbs" style={{ width: `${carbs}%` }} />
        <div className="macro-segment fat" style={{ width: `${fat}%` }} />
      </div>
      <div className="macro-slider-ranges">
        <input
          type="range"
          min={0}
          max={boundaryTwo}
          value={boundaryOne}
          onChange={(event) => {
            const nextOne = Number(event.target.value)
            onChange({
              protein: nextOne,
              carbs: boundaryTwo - nextOne,
              fat: 100 - boundaryTwo,
            })
          }}
          aria-label="Protein-Carbs boundary"
        />
        <input
          type="range"
          min={boundaryOne}
          max={100}
          value={boundaryTwo}
          onChange={(event) => {
            const nextTwo = Number(event.target.value)
            onChange({
              protein: boundaryOne,
              carbs: nextTwo - boundaryOne,
              fat: 100 - nextTwo,
            })
          }}
          aria-label="Carbs-Fat boundary"
        />
      </div>
      <div className="macro-slider-labels">
        <span>P {protein}%</span>
        <span>C {carbs}%</span>
        <span>F {fat}%</span>
      </div>
    </div>
  )
}

function WeeklyTab(props: {
  state: AppState
  selectedWeek: WeekPlan
  weekVersions: RecipeVersion[]
  weekEntries: AppState['entries']
  selectedVersion: RecipeVersion | null
  shoppingList: ReturnType<typeof generateShoppingList>
  ingredientDb: IngredientRecord[]
  onSelectVersion: (id: string) => void
  onUpdateVersion: (id: string, updater: (version: RecipeVersion) => RecipeVersion) => void
  onUpdateIngredient: (versionId: string, lineId: string, patch: Partial<IngredientLine>) => void
  onAddIngredientToVersion: (versionId: string) => void
  onRemoveIngredientFromVersion: (versionId: string, lineId: string) => void
  onOpenIngredientDb: () => void
  onHandleMake: (version: RecipeVersion) => void
  onReloadVersionFromTemplate: (versionId: string) => void
  onSaveVersionAsNewDefault: (version: RecipeVersion) => void
  onVersionServings: (version: RecipeVersion, servings: number) => void
  unassignedBoxes: AppState['boxes']
  unassignedExtras: AppState['extras']
  onAssignBox: (boxId: string, dayIndex: number, mealType: MealType) => void
  onAssignExtra: (extraId: string, dayIndex: number, mealType: MealType) => void
  draggedItem: DraggedItem
  onSetDraggedItem: (item: DraggedItem) => void
  onClearDraggedItem: () => void
  onRemoveEntry: (entryId: string) => void
  onUpdateBoxFraction: (boxId: string, fraction: number) => void
  onUpdateShoppingMode: (mode: ShoppingMode) => void
  onUpdateDayCalorieTarget: (dayIndex: number, value: number | null) => void
  onUpdateDefaultDailyCalorieTarget: (value: number | null) => void
  onApplyDefaultDailyCalorieTarget: () => void
  onUpdateMacroTargetSplit: (split: MacroSplit) => void
  onCopyShoppingList: () => void
  onExportShoppingListPdf: () => void
  onExportWeekPdf: () => void
  onDeleteExtra: (extraId: string) => void
  onDeleteBatchForVersion: (versionId: string) => void
}) {
  const {
    state,
    selectedWeek,
    weekVersions,
    weekEntries,
    selectedVersion,
    shoppingList,
    ingredientDb,
    onSelectVersion,
    onUpdateVersion,
    onUpdateIngredient,
    onAddIngredientToVersion,
    onRemoveIngredientFromVersion,
    onOpenIngredientDb,
    onHandleMake,
    onReloadVersionFromTemplate,
    onSaveVersionAsNewDefault,
    onVersionServings,
    unassignedBoxes,
    unassignedExtras,
    onAssignBox,
    onAssignExtra,
    draggedItem,
    onSetDraggedItem,
    onClearDraggedItem,
    onRemoveEntry,
    onUpdateBoxFraction,
    onUpdateShoppingMode,
    onUpdateDayCalorieTarget,
    onUpdateDefaultDailyCalorieTarget,
    onApplyDefaultDailyCalorieTarget,
    onUpdateMacroTargetSplit,
    onCopyShoppingList,
    onExportShoppingListPdf,
    onExportWeekPdf,
    onDeleteExtra,
    onDeleteBatchForVersion,
  } = props

  const selectedVersionBoxes = selectedVersion
    ? state.boxes.filter((box) => box.recipeVersionId === selectedVersion.id)
    : []
  const selectedVersionAssignedEntries = selectedVersion
    ? weekEntries.filter(
        (entry) =>
          entry.sourceType === 'box' &&
          selectedVersionBoxes.some((box) => box.id === entry.sourceId),
      )
    : []
  const sortedIngredientDb = sortIngredientRecords(ingredientDb)
  const sortedVersionIngredients = selectedVersion
    ? sortIngredientLinesForRecipe(selectedVersion.ingredients)
    : []

  return (
    <section className="page-grid weekly-grid">
      <div className="surface versions-panel">
        <div className="panel-header">
          <h3>Recipe Versions</h3>
          <span className="badge">{weekVersions.length}</span>
        </div>

        <div className="version-list">
          {weekVersions.map((version) => (
            <button
              key={version.id}
              className={selectedVersion?.id === version.id ? 'version-card active' : 'version-card'}
              onClick={() => onSelectVersion(version.id)}
            >
              <div>
                <h4>{version.name}</h4>
              </div>
              <div className="mini-metrics">
                <span>{version.servings} servings</span>
                <span>{version.lastMadeAt ? 'Made' : 'Draft'}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedVersion ? (
          <div className="editor">
            <div className="panel-header">
              <h3>{selectedVersion.name}</h3>
              <div className="action-row">
                <button onClick={() => onHandleMake(selectedVersion)}>Make</button>
                <button
                  className="secondary-button"
                  onClick={() => onReloadVersionFromTemplate(selectedVersion.id)}
                >
                  Reload default
                </button>
                <button
                  className="secondary-button"
                  onClick={() => onSaveVersionAsNewDefault(selectedVersion)}
                >
                  Save as new recipe
                </button>
                {selectedVersionBoxes.length > 0 ? (
                  <button
                    className="secondary-button"
                    disabled={selectedVersionAssignedEntries.length > 0}
                    onClick={() => onDeleteBatchForVersion(selectedVersion.id)}
                    title={
                      selectedVersionAssignedEntries.length > 0
                        ? 'Unassign every box from the week before deleting the batch.'
                        : 'Delete all made boxes for this recipe version.'
                    }
                  >
                    Delete batch
                  </button>
                ) : null}
              </div>
            </div>

            {selectedVersionBoxes.length > 0 ? (
              <p className="muted">
                Batch status: {selectedVersionBoxes.length} boxes made,{' '}
                {selectedVersionAssignedEntries.length} still assigned in the week.
              </p>
            ) : null}

            <label>
              Name
              <input
                value={selectedVersion.name}
                onChange={(event) =>
                  onUpdateVersion(selectedVersion.id, (version) => ({
                    ...version,
                    name: event.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
              />
            </label>

            <label>
              Servings
              <input
                type="number"
                min={1}
                value={selectedVersion.servings}
                onChange={(event) =>
                  onVersionServings(selectedVersion, Number(event.target.value))
                }
              />
            </label>

            <div className="nutrition-editor readonly">
              <div className="metric-tile">
                <span>Calories / serving</span>
                <strong>{selectedVersion.nutritionPerServing.calories}</strong>
              </div>
              <div className="metric-tile">
                <span>Protein</span>
                <strong>{selectedVersion.nutritionPerServing.protein}g</strong>
              </div>
              <div className="metric-tile">
                <span>Carbs</span>
                <strong>{selectedVersion.nutritionPerServing.carbs}g</strong>
              </div>
              <div className="metric-tile">
                <span>Fat</span>
                <strong>{selectedVersion.nutritionPerServing.fat}g</strong>
              </div>
            </div>

            <label>
              Week notes
              <textarea
                value={selectedVersion.notes}
                onChange={(event) =>
                  onUpdateVersion(selectedVersion.id, (version) => ({
                    ...version,
                    notes: event.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
              />
            </label>

            <div className="version-total">
              <span>Total recipe nutrition</span>
              <strong>
                {selectedVersion.nutritionPerServing.calories * selectedVersion.servings} kcal /{' '}
                {selectedVersion.nutritionPerServing.protein * selectedVersion.servings}P /{' '}
                {selectedVersion.nutritionPerServing.carbs * selectedVersion.servings}C /{' '}
                {selectedVersion.nutritionPerServing.fat * selectedVersion.servings}F
              </strong>
            </div>

            <p className="muted">
              Nutrition is calculated from the ingredient list.
              {selectedVersion.unresolvedIngredients > 0
                ? ` ${selectedVersion.unresolvedIngredients} ingredient line(s) still need clearer quantities or unit mappings.`
                : ' All current ingredient lines are being counted.'}
            </p>

            <div className="ingredient-table">
              <div className="panel-header">
                <h4>Ingredients</h4>
                <div className="action-row">
                  <span className="muted">Weekly edits stay on this dated version.</span>
                  <button
                    className="secondary-button"
                    onClick={() => onAddIngredientToVersion(selectedVersion.id)}
                  >
                    Add ingredient
                  </button>
                  <button
                    className="secondary-button"
                    onClick={onOpenIngredientDb}
                  >
                    Ingredient database
                  </button>
                </div>
              </div>
              {sortedVersionIngredients.map((ingredient) => {
                const lineNutrition = getIngredientLineNutrition(ingredient)
                return (
                <div key={ingredient.id} className="ingredient-row">
                  <div className="ingredient-controls ingredient-controls-compact">
                    <select
                      aria-label="Ingredient"
                      value={ingredient.name}
                      onChange={(event) =>
                        onUpdateIngredient(selectedVersion.id, ingredient.id, {
                          name: event.target.value,
                        })
                      }
                    >
                      <option value="">Ingredient</option>
                      {sortedIngredientDb.map((record) => (
                        <option key={record.id} value={record.name}>
                          {record.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Ingredient amount"
                      type="number"
                      value={ingredient.quantity ?? ''}
                      placeholder="Qty"
                      onChange={(event) =>
                        onUpdateIngredient(selectedVersion.id, ingredient.id, {
                          quantity: event.target.value === '' ? null : Number(event.target.value),
                        })
                      }
                    />
                    <select
                      aria-label="Ingredient unit"
                      value={ingredient.unit ?? ''}
                      onChange={(event) =>
                        onUpdateIngredient(selectedVersion.id, ingredient.id, {
                          unit: event.target.value || null,
                        })
                      }
                    >
                      <option value="">Unit</option>
                      {getAvailableUnits(ingredient).map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="secondary-button ingredient-remove"
                      onClick={() =>
                        onRemoveIngredientFromVersion(selectedVersion.id, ingredient.id)
                      }
                      aria-label={`Remove ${ingredient.name || 'ingredient'}`}
                      title="Remove ingredient"
                    >
                      X
                    </button>
                  </div>
                  <small className="ingredient-micro-macros">
                    {lineNutrition.isResolved
                      ? `${lineNutrition.nutrition.calories} kcal · ${lineNutrition.nutrition.protein}P · ${lineNutrition.nutrition.carbs}C · ${lineNutrition.nutrition.fat}F`
                      : 'Incomplete macros for this line'}
                  </small>
                  {ingredient.isIncomplete ? (
                    <small className="ingredient-warning">
                      This ingredient needs a complete database setup (calories per 100g and unit conversion) to fully count in recipe totals.
                    </small>
                  ) : null}
                </div>
              )})}
            </div>

          </div>
        ) : (
          <p className="muted">Pick a recipe version to edit it.</p>
        )}
      </div>

      <div className="surface planner-panel">
        <div className="panel-header planner-header">
          <div>
            <h3>Weekly Planner</h3>
            <p className="muted">Drop recipe boxes or extra snacks onto any meal slot.</p>
          </div>
          <div className="planner-header-controls">
            <MacroSplitSlider
              split={selectedWeek.macroTargetPercentages}
              onChange={onUpdateMacroTargetSplit}
            />
            <div className="target-toolbar compact">
              <label>
                Default daily target
                <input
                  type="number"
                  min={0}
                  value={selectedWeek.defaultDailyCalorieTarget ?? ''}
                  placeholder="e.g. 2000"
                  onChange={(event) =>
                    onUpdateDefaultDailyCalorieTarget(
                      event.target.value === '' ? null : Number(event.target.value),
                    )
                  }
                />
              </label>
              <button
                className="secondary-button"
                onClick={onApplyDefaultDailyCalorieTarget}
              >
                Fill all 7 days
              </button>
            </div>
          </div>
        </div>

        <div className="planner-scroll">
          <div className="planner-grid">
            <div className="planner-corner">Meal</div>
            {dayNames.map((day, index) => (
              <div key={day} className="planner-day">
                <span>{day}</span>
                <strong>{shortDateLabel(addDays(selectedWeek.weekStart, index))}</strong>
                <label className="day-target-input">
                  <span>Target</span>
                  <input
                    type="number"
                    min={0}
                    value={selectedWeek.dailyCalorieTargets[index] ?? ''}
                    placeholder={
                      selectedWeek.defaultDailyCalorieTarget
                        ? String(selectedWeek.defaultDailyCalorieTarget)
                        : 'kcal'
                    }
                    onChange={(event) =>
                      onUpdateDayCalorieTarget(
                        index,
                        event.target.value === '' ? null : Number(event.target.value),
                      )
                    }
                  />
                </label>
              </div>
            ))}

            {mealTypes.map((mealType) => (
              <MealRow
                key={mealType}
                mealType={mealType}
                weekEntries={weekEntries}
                state={state}
                draggedItem={draggedItem}
                onSetDraggedItem={onSetDraggedItem}
                onAssignBox={onAssignBox}
                onAssignExtra={onAssignExtra}
                onClearDraggedItem={onClearDraggedItem}
                onRemoveEntry={onRemoveEntry}
                onUpdateBoxFraction={onUpdateBoxFraction}
              />
            ))}

            <div className="meal-label totals-label">Totals</div>
            {dayNames.map((_, dayIndex) => {
              const daySummary = buildDaySummary(dayIndex, weekEntries, state)
              const target = selectedWeek.dailyCalorieTargets[dayIndex]
              const macroTarget = macroTargetsFromCalories(
                target,
                selectedWeek.macroTargetPercentages,
              )
              return (
                <div key={`totals-${dayIndex}`} className="planner-day-total">
                  <span className="target-compare">
                    {formatCalories(daySummary.planned.calories)} planned / {formatCalories(target)} target
                  </span>
                  <span className="muted">
                    Target: {macroTarget.protein}P / {macroTarget.carbs}C / {macroTarget.fat}F
                  </span>
                  <span>
                    Consumed: {daySummary.consumed.calories} kcal
                  </span>
                  <span>
                    {daySummary.consumed.protein}P / {daySummary.consumed.carbs}C /{' '}
                    {daySummary.consumed.fat}F
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="planner-pools">
          <section className="planner-pool">
            <div className="panel-header">
              <div>
                <h4>Unassigned Recipe Boxes</h4>
                <p className="muted">These boxes are ready to drag into the week.</p>
              </div>
              <span className="badge">{unassignedBoxes.length}</span>
            </div>
            {unassignedBoxes.length > 0 ? (
              <div className="pool-grid">
                {unassignedBoxes.map((box) => (
                  <BoxCard
                    key={box.id}
                    box={box}
                    onFractionChange={(value) => onUpdateBoxFraction(box.id, value)}
                    onDragStart={() => onSetDraggedItem({ kind: 'box', id: box.id })}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">
                All current recipe boxes are assigned in the planner. Unassign one to bring it back here.
              </p>
            )}
          </section>

          <section className="planner-pool">
            <div className="panel-header">
              <div>
                <h4>Unassigned Extras</h4>
                <p className="muted">Unassign an extra snack first, then delete it from this pool if needed.</p>
              </div>
              <span className="badge">{unassignedExtras.length}</span>
            </div>
            {unassignedExtras.length > 0 ? (
              <div className="pool-grid extras-grid">
                {unassignedExtras.map((extra) => (
                  <ExtraCard
                    key={extra.id}
                    extra={extra}
                    onDragStart={() => onSetDraggedItem({ kind: 'extra', id: extra.id })}
                    onDelete={() => onDeleteExtra(extra.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">
                No unassigned extras right now. Add one from the left sidebar or unassign one from the week.
              </p>
            )}
          </section>

          <section className="planner-pool">
            <div className="panel-header">
              <div>
                <h4>Shopping List</h4>
                <p className="muted">Only made recipe batches count here, and matching ingredients are added together.</p>
              </div>
              <div className="shopping-actions">
                <div className="segmented">
                  <button
                    className={selectedWeek.shoppingMode === 'assigned' ? 'active' : ''}
                    onClick={() => onUpdateShoppingMode('assigned')}
                  >
                    Assigned
                  </button>
                  <button
                    className={selectedWeek.shoppingMode === 'allVersions' ? 'active' : ''}
                    onClick={() => onUpdateShoppingMode('allVersions')}
                  >
                    All
                  </button>
                </div>
                <div className="action-row">
                  <button className="secondary-button" onClick={onCopyShoppingList}>
                    Copy list
                  </button>
                  <button className="secondary-button" onClick={onExportShoppingListPdf}>
                    Shopping PDF
                  </button>
                  <button className="secondary-button" onClick={onExportWeekPdf}>
                    Full week PDF
                  </button>
                </div>
              </div>
            </div>
            <div className="shopping-groups shopping-inline">
              {shoppingList.map((group) => (
                <div key={group.category} className="shopping-group">
                  <h4>{formatCategory(group.category)}</h4>
                  <ul>
                    {group.items.length > 0 ? (
                      group.items.map((item) => (
                        <li key={`${item.name}-${item.unit}`}>
                          <span>{item.name}</span>
                          <strong>
                            {item.quantityText}
                            {item.incomplete ? ' *' : ''}
                          </strong>
                        </li>
                      ))
                    ) : (
                      <li>
                        <span className="muted">Nothing needed here yet.</span>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

    </section>
  )
}

function MealRow({
  mealType,
  weekEntries,
  state,
  draggedItem,
  onSetDraggedItem,
  onAssignBox,
  onAssignExtra,
  onClearDraggedItem,
  onRemoveEntry,
  onUpdateBoxFraction,
}: {
  mealType: MealType
  weekEntries: AppState['entries']
  state: AppState
  draggedItem: DraggedItem
  onSetDraggedItem: (item: DraggedItem) => void
  onAssignBox: (boxId: string, dayIndex: number, mealType: MealType) => void
  onAssignExtra: (extraId: string, dayIndex: number, mealType: MealType) => void
  onClearDraggedItem: () => void
  onRemoveEntry: (entryId: string) => void
  onUpdateBoxFraction: (boxId: string, fraction: number) => void
}) {
  return (
    <>
      <div className="meal-label">{formatMealType(mealType)}</div>
      {dayNames.map((_, dayIndex) => {
        const slotEntries = weekEntries.filter(
          (entry) => entry.dayIndex === dayIndex && entry.mealType === mealType,
        )

        return (
          <div
            key={`${mealType}-${dayIndex}`}
            className="planner-cell"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!draggedItem) return
              if (draggedItem.kind === 'box') {
                onAssignBox(draggedItem.id, dayIndex, mealType)
              } else {
                onAssignExtra(draggedItem.id, dayIndex, mealType)
              }
              onClearDraggedItem()
            }}
          >
            {slotEntries.map((entry) => (
              <PlannerCard
                key={entry.id}
                entry={entry}
                state={state}
                onDragStart={() =>
                  onSetDraggedItem({
                    kind: entry.sourceType,
                    id: entry.sourceId,
                  })
                }
                onRemove={() => onRemoveEntry(entry.id)}
                onPortionChange={(value) => {
                  if (entry.sourceType === 'box') {
                    onUpdateBoxFraction(entry.sourceId, value)
                  }
                }}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}

function RecipesTab({
  templates,
  selectedTemplate,
  ingredientDb,
  selectedWeekStart,
  onSelectTemplate,
  onUpdateTemplate,
  onUpdateTemplateIngredient,
  onAddIngredientToTemplate,
  onRemoveIngredientFromTemplate,
  onOpenIngredientDb,
  onSaveTemplateAsNewDefault,
  onAddVersion,
}: {
  templates: RecipeTemplate[]
  selectedTemplate: RecipeTemplate | null
  ingredientDb: IngredientRecord[]
  selectedWeekStart: string
  onSelectTemplate: (id: string) => void
  onUpdateTemplate: (id: string, updater: (template: RecipeTemplate) => RecipeTemplate) => void
  onUpdateTemplateIngredient: (
    templateId: string,
    lineId: string,
    patch: Partial<IngredientLine>,
  ) => void
  onAddIngredientToTemplate: (templateId: string) => void
  onRemoveIngredientFromTemplate: (templateId: string, lineId: string) => void
  onOpenIngredientDb: () => void
  onSaveTemplateAsNewDefault: (template: RecipeTemplate) => void
  onAddVersion: (template: RecipeTemplate) => void
}) {
  const sortedIngredientDb = sortIngredientRecords(ingredientDb)
  const sortedTemplateIngredients = selectedTemplate
    ? sortIngredientLinesForRecipe(selectedTemplate.ingredients)
    : []

  return (
    <section className="page-grid">
      <div className="surface versions-panel">
        <div className="panel-header">
          <div>
            <h3>Default Recipes</h3>
            <p className="muted">
              Set your reusable baseline here. New weekly versions for {weekLabel(selectedWeekStart)} will copy these defaults.
            </p>
          </div>
        </div>

        <div className="version-list">
          {templates.map((template) => (
            <button
              key={template.id}
              className={selectedTemplate?.id === template.id ? 'version-card active' : 'version-card'}
              onClick={() => onSelectTemplate(template.id)}
            >
              <div>
                <h4>{template.name}</h4>
                <p className="muted">{template.description}</p>
              </div>
              <div className="mini-metrics">
                <span>{template.defaultServings} servings</span>
                <span>{template.ingredients.length} ingredients</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="surface">
        {selectedTemplate ? (
          <div className="editor">
            <div className="panel-header">
              <div>
                <h3>{selectedTemplate.name}</h3>
                <p className="muted">Edit the reusable defaults here, then copy this recipe into any week when you need it.</p>
              </div>
              <div className="action-row">
                <button
                  className="secondary-button"
                  onClick={() => onSaveTemplateAsNewDefault(selectedTemplate)}
                >
                  Save as new recipe
                </button>
                <button onClick={() => onAddVersion(selectedTemplate)}>Add to week</button>
              </div>
            </div>

            <label>
              Name
              <input
                value={selectedTemplate.name}
                onChange={(event) =>
                  onUpdateTemplate(selectedTemplate.id, (template) => ({
                    ...template,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Description
              <textarea
                value={selectedTemplate.description}
                onChange={(event) =>
                  onUpdateTemplate(selectedTemplate.id, (template) => ({
                    ...template,
                    description: event.target.value,
                  }))
                }
              />
            </label>

            <div className="grid-two">
              <label>
                Default servings
                <input
                  type="number"
                  min={1}
                  value={selectedTemplate.defaultServings}
                  onChange={(event) =>
                    onUpdateTemplate(selectedTemplate.id, (template) => ({
                      ...template,
                      defaultServings: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Tags
                <input
                  value={selectedTemplate.tags.join(', ')}
                  placeholder="high protein, make ahead"
                  onChange={(event) =>
                    onUpdateTemplate(selectedTemplate.id, (template) => ({
                      ...template,
                      tags: event.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </label>
            </div>

            <div className="nutrition-editor readonly">
              <div className="metric-tile">
                <span>Calories / serving</span>
                <strong>{selectedTemplate.nutritionPerServing.calories}</strong>
              </div>
              <div className="metric-tile">
                <span>Protein</span>
                <strong>{selectedTemplate.nutritionPerServing.protein}g</strong>
              </div>
              <div className="metric-tile">
                <span>Carbs</span>
                <strong>{selectedTemplate.nutritionPerServing.carbs}g</strong>
              </div>
              <div className="metric-tile">
                <span>Fat</span>
                <strong>{selectedTemplate.nutritionPerServing.fat}g</strong>
              </div>
            </div>

            <label>
              Default notes
              <textarea
                value={selectedTemplate.notes ?? ''}
                onChange={(event) =>
                  onUpdateTemplate(selectedTemplate.id, (template) => ({
                    ...template,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Instructions (one step per line)
              <textarea
                value={selectedTemplate.instructions.join('\n')}
                placeholder={'Mix ingredients\nBake at 200C\nPortion into boxes'}
                onChange={(event) =>
                  onUpdateTemplate(selectedTemplate.id, (template) => ({
                    ...template,
                    instructions: event.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>

            <p className="muted">
              Ingredient nutrition and quantities here become the starting defaults for every future weekly version.
            </p>

            <div className="ingredient-table">
              <div className="panel-header">
                <h4>Default Ingredients</h4>
                <div className="action-row">
                  <span className="muted">These defaults can still be changed inside a specific week before making boxes.</span>
                  <button
                    className="secondary-button"
                    onClick={() => onAddIngredientToTemplate(selectedTemplate.id)}
                  >
                    Add ingredient
                  </button>
                  <button
                    className="secondary-button"
                    onClick={onOpenIngredientDb}
                  >
                    Ingredient database
                  </button>
                </div>
              </div>

              {sortedTemplateIngredients.map((ingredient) => {
                const lineNutrition = getIngredientLineNutrition(ingredient)
                return (
                <div key={ingredient.id} className="ingredient-row">
                  <div className="ingredient-controls ingredient-controls-compact">
                    <select
                      aria-label="Ingredient"
                      value={ingredient.name}
                      onChange={(event) =>
                        onUpdateTemplateIngredient(selectedTemplate.id, ingredient.id, {
                          name: event.target.value,
                        })
                      }
                    >
                      <option value="">Ingredient</option>
                      {sortedIngredientDb.map((record) => (
                        <option key={record.id} value={record.name}>
                          {record.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Ingredient amount"
                      type="number"
                      value={ingredient.quantity ?? ''}
                      placeholder="Qty"
                      onChange={(event) =>
                        onUpdateTemplateIngredient(selectedTemplate.id, ingredient.id, {
                          quantity: event.target.value === '' ? null : Number(event.target.value),
                        })
                      }
                    />
                    <select
                      aria-label="Ingredient unit"
                      value={ingredient.unit ?? ''}
                      onChange={(event) =>
                        onUpdateTemplateIngredient(selectedTemplate.id, ingredient.id, {
                          unit: event.target.value || null,
                        })
                      }
                    >
                      <option value="">Unit</option>
                      {getAvailableUnits(ingredient).map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="secondary-button ingredient-remove"
                      onClick={() =>
                        onRemoveIngredientFromTemplate(selectedTemplate.id, ingredient.id)
                      }
                      aria-label={`Remove ${ingredient.name || 'ingredient'}`}
                      title="Remove ingredient"
                    >
                      X
                    </button>
                  </div>
                  <small className="ingredient-micro-macros">
                    {lineNutrition.isResolved
                      ? `${lineNutrition.nutrition.calories} kcal · ${lineNutrition.nutrition.protein}P · ${lineNutrition.nutrition.carbs}C · ${lineNutrition.nutrition.fat}F`
                      : 'Incomplete macros for this line'}
                  </small>
                  {ingredient.isIncomplete ? (
                    <small className="ingredient-warning">
                      This ingredient needs a complete database setup (calories per 100g and unit conversion) to fully count in template totals.
                    </small>
                  ) : null}
                </div>
              )})}
            </div>
          </div>
        ) : (
          <p className="muted">Pick a default recipe to edit its reusable baseline.</p>
        )}
      </div>
    </section>
  )
}

function IngredientDbTab({
  ingredientDb,
  onCreateIngredientRecord,
  onUpdateIngredientRecord,
  onRestoreDefaults,
}: {
  ingredientDb: IngredientRecord[]
  onCreateIngredientRecord: (record: Omit<IngredientRecord, 'id' | 'source'>) => void
  onUpdateIngredientRecord: (
    recordId: string,
    updater: (record: IngredientRecord) => IngredientRecord,
  ) => void
  onRestoreDefaults: () => void
}) {
  const [draftIngredient, setDraftIngredient] = useState<Omit<IngredientRecord, 'id' | 'source'> | null>(null)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'default' | 'mine'>('all')
  const [mfpImportJson, setMfpImportJson] = useState('')
  const displayNumberInput = (value: number) => (value === 0 ? '' : String(value))
  const sortedIngredientDb = sortIngredientRecords(ingredientDb)
  const filteredIngredientDb = sortedIngredientDb.filter((record) => {
    if (sourceFilter === 'all') return true
    if (sourceFilter === 'default') return record.source === 'default'
    return record.source === 'user'
  })

  const applyMfpImportToDraft = () => {
    if (!mfpImportJson.trim()) {
      window.alert('Paste MyFitnessPal JSON first.')
      return
    }

    try {
      const parsed = JSON.parse(mfpImportJson) as
        | {
            name?: unknown
            brand?: unknown
            serving?: unknown
            nutritionPerServing?: {
              calories?: unknown
              protein?: unknown
              carbs?: unknown
              fat?: unknown
            }
          }
        | Array<{
            name?: unknown
            brand?: unknown
            serving?: unknown
            nutritionPerServing?: {
              calories?: unknown
              protein?: unknown
              carbs?: unknown
              fat?: unknown
            }
          }>

      const source = Array.isArray(parsed) ? parsed[0] : parsed
      if (!source || typeof source !== 'object') {
        window.alert('Invalid JSON format.')
        return
      }

      const name = String(source.name ?? '').trim()
      if (!name) {
        window.alert('Imported JSON is missing the ingredient name.')
        return
      }

      const brand = String(source.brand ?? '').trim()
      const serving = String(source.serving ?? '').trim()
      const calories = Number(source.nutritionPerServing?.calories ?? 0)
      const protein = Number(source.nutritionPerServing?.protein ?? 0)
      const carbs = Number(source.nutritionPerServing?.carbs ?? 0)
      const fat = Number(source.nutritionPerServing?.fat ?? 0)

      const servingLabel = serving || '1 serving'
      const notes = [
        'Imported from MyFitnessPal (local helper).',
        brand ? `Brand: ${brand}` : null,
        `Serving: ${servingLabel}`,
        'Set grams-per-unit for exact recipe math.',
      ]
        .filter(Boolean)
        .join(' ')

      setDraftIngredient((current) => ({
        name: brand ? `${name} (${brand})` : name,
        category: current?.category ?? 'pantry',
        nutritionPer100g: {
          calories,
          protein,
          carbs,
          fat,
        },
        unitGrams: {
          g: 1,
          unit: current?.unitGrams?.unit ?? 100,
          cup: current?.unitGrams?.cup,
          tbsp: current?.unitGrams?.tbsp,
          tsp: current?.unitGrams?.tsp,
          ml: current?.unitGrams?.ml,
        },
        notes,
      }))
    } catch {
      window.alert('Could not parse JSON. Paste valid output from tools/mfp_food_search.py')
    }
  }

  return (
    <section className="surface tab-surface">
      <div className="panel-header">
        <div>
          <h4>Ingredient Database</h4>
          <p className="muted">
            Create ingredients here once, then reuse them in both weekly and default recipe editors.
          </p>
        </div>
        <div className="action-row">
          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value as 'all' | 'default' | 'mine')
            }
            aria-label="Filter ingredient source"
          >
            <option value="all">All ingredients</option>
            <option value="default">Default only</option>
            <option value="mine">Added by me</option>
          </select>
          <button className="secondary-button" onClick={onRestoreDefaults}>
            Restore defaults
          </button>
          <button
            onClick={() =>
              setDraftIngredient({
                name: '',
                category: 'pantry',
                nutritionPer100g: emptyNutrition(),
                unitGrams: { g: 1 },
                notes: '',
              })
            }
          >
            Add new ingredient
          </button>
        </div>
      </div>
      <p className="muted">
        Conversion guide: `kcal per cup = (grams per cup * kcal per 100g) / 100`.
        Same for tbsp and tsp with their grams-per-unit values.
      </p>
      <div className="ingredient-row">
        <div className="panel-header">
          <h4>MyFitnessPal Import (Local)</h4>
          <button className="secondary-button" onClick={applyMfpImportToDraft}>
            Use for draft ingredient
          </button>
        </div>
        <p className="muted">
          Run `python tools/mfp_food_search.py "ingredient name" --limit 5`, then paste one
          JSON result (or the whole list) below.
        </p>
        <textarea
          value={mfpImportJson}
          placeholder={'[{"name":"Banana","brand":"USDA","serving":"1 medium","nutritionPerServing":{"calories":105,"protein":1.3,"carbs":27,"fat":0.4}}]'}
          onChange={(event) => setMfpImportJson(event.target.value)}
        />
      </div>

      {draftIngredient ? (
        <div className="ingredient-row">
          <div className="panel-header">
            <h4>New Ingredient (Draft)</h4>
            <div className="action-row">
              <button className="secondary-button" onClick={() => setDraftIngredient(null)}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!draftIngredient.name.trim()) {
                    window.alert('Add an ingredient name first.')
                    return
                  }
                  onCreateIngredientRecord({
                    ...draftIngredient,
                    name: draftIngredient.name.trim(),
                  })
                  setDraftIngredient(null)
                }}
              >
                Save ingredient
              </button>
            </div>
          </div>
          <div className="ingredient-meta">
            <label>
              Ingredient name
              <input
                value={draftIngredient.name}
                onChange={(event) =>
                  setDraftIngredient((current) =>
                    current
                      ? {
                          ...current,
                          name: event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>
            <label>
              Notes
              <input
                value={draftIngredient.notes ?? ''}
                placeholder="Optional sourcing or label notes"
                onChange={(event) =>
                  setDraftIngredient((current) =>
                    current
                      ? {
                          ...current,
                          notes: event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>
          </div>
          <div className="ingredient-controls">
            <select
              value={draftIngredient.category}
              onChange={(event) =>
                setDraftIngredient((current) =>
                  current
                    ? {
                        ...current,
                        category: event.target.value as GroceryCategory,
                      }
                    : current,
                )
              }
            >
              <option value="pantry">Pantry</option>
              <option value="fruitVeg">Fruit/Veg</option>
              <option value="meatDairy">Meat/Dairy</option>
            </select>
          </div>
          <div className="ingredient-nutrition-grid">
            {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
              <label key={field}>
                {field} / 100g
                <input
                  type="number"
                  min={0}
                  value={displayNumberInput(draftIngredient.nutritionPer100g[field])}
                  placeholder="0"
                  onChange={(event) =>
                    setDraftIngredient((current) =>
                      current
                        ? {
                            ...current,
                            nutritionPer100g: {
                              ...current.nutritionPer100g,
                              [field]: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            ))}
            {(['unit', 'cup', 'tbsp', 'tsp', 'ml'] as const).map((unit) => (
              <label key={unit}>
                g per {unit}
                <input
                  type="number"
                  min={0}
                  value={draftIngredient.unitGrams[unit] ?? ''}
                  onChange={(event) =>
                    setDraftIngredient((current) =>
                      current
                        ? {
                            ...current,
                            unitGrams: {
                              ...current.unitGrams,
                              [unit]:
                                event.target.value === ''
                                  ? undefined
                                  : Number(event.target.value),
                              g: 1,
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ingredient-table">
        {filteredIngredientDb.map((record) => (
          <details key={record.id} className="ingredient-dropdown">
            <summary>
              <span>{record.name}</span>
              <small>
                {record.source === 'user' ? 'Added by you' : 'Default'} · {formatCategory(record.category)}
              </small>
            </summary>
            <div className="ingredient-row">
              <div className="ingredient-meta">
                <label>
                  Ingredient name
                  <input
                    value={record.name}
                    onChange={(event) =>
                      onUpdateIngredientRecord(record.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Notes
                  <input
                    value={record.notes ?? ''}
                    placeholder="Optional sourcing or label notes"
                    onChange={(event) =>
                      onUpdateIngredientRecord(record.id, (current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="ingredient-controls">
                <select
                  value={record.category}
                  onChange={(event) =>
                    onUpdateIngredientRecord(record.id, (current) => ({
                      ...current,
                      category: event.target.value as GroceryCategory,
                    }))
                  }
                >
                  <option value="pantry">Pantry</option>
                  <option value="fruitVeg">Fruit/Veg</option>
                  <option value="meatDairy">Meat/Dairy</option>
                </select>
              </div>
              <div className="ingredient-nutrition-grid">
                {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                  <label key={field}>
                    {field} / 100g
                <input
                  type="number"
                  min={0}
                  value={displayNumberInput(record.nutritionPer100g[field])}
                  placeholder="0"
                  onChange={(event) =>
                    onUpdateIngredientRecord(record.id, (current) => ({
                          ...current,
                          nutritionPer100g: {
                            ...current.nutritionPer100g,
                            [field]: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                ))}
                {(['unit', 'cup', 'tbsp', 'tsp', 'ml'] as const).map((unit) => (
                  <label key={unit}>
                    g per {unit}
                    <input
                      type="number"
                      min={0}
                      value={record.unitGrams[unit] ?? ''}
                      onChange={(event) =>
                        onUpdateIngredientRecord(record.id, (current) => ({
                          ...current,
                          unitGrams: {
                            ...current.unitGrams,
                            [unit]:
                              event.target.value === ''
                                ? undefined
                                : Number(event.target.value),
                            g: 1,
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

function CalendarTab({
  state,
  selectedWeekStart,
  onOpenWeek,
}: {
  state: AppState
  selectedWeekStart: string
  onOpenWeek: (weekStart: string) => void
}) {
  return (
    <section className="surface tab-surface">
      <div className="panel-header">
        <div>
          <h3>Calendar & History</h3>
          <p className="muted">
            Every week stays saved, including the dated recipe versions used at that time.
          </p>
        </div>
      </div>

      <div className="history-grid">
        {state.weeks
          .slice()
          .sort((left, right) => (left.weekStart > right.weekStart ? -1 : 1))
          .map((week) => {
            const entries = state.entries.filter((entry) => week.entryIds.includes(entry.id))
            const summary = buildWeekSummary(entries, state)
            return (
              <button
                key={week.weekStart}
                className={selectedWeekStart === week.weekStart ? 'history-card active' : 'history-card'}
                onClick={() => onOpenWeek(week.weekStart)}
              >
                <p className="eyebrow">{weekLabel(week.weekStart)}</p>
                <h4>{week.title}</h4>
                <p>{week.notes || 'Saved weekly snapshot'}</p>
                <div className="mini-metrics">
                  <span>{week.recipeVersionIds.length} versions</span>
                  <span>{week.entryIds.length} entries</span>
                </div>
                <div className="mini-metrics">
                  <span>{summary.planned.calories} kcal planned</span>
                  <span>{summary.consumed.calories} kcal consumed</span>
                </div>
              </button>
            )
          })}
      </div>
    </section>
  )
}

function StatsTab({ stats }: { stats: ReturnType<typeof buildStats> }) {
  return (
    <section className="surface tab-surface">
      <div className="stats-grid">
        <StatCard label="Avg planned / day" value={`${stats.averagePlannedCalories} kcal`} />
        <StatCard label="Avg consumed / day" value={`${stats.averageConsumedCalories} kcal`} />
        <StatCard label="Avg protein / day" value={`${stats.averageConsumedProtein} g`} />
        <StatCard label="Tracked weeks" value={`${stats.weekCount}`} />
      </div>
      <div className="weekly-bar-list">
        {stats.weekBreakdown.map((week) => (
          <div key={week.weekStart} className="week-bar-row">
            <div>
              <strong>{weekLabel(week.weekStart)}</strong>
              <p className="muted">{week.entries} entries tracked</p>
            </div>
            <div>
              <div className="bar-block">
                <span>Planned</span>
                <div className="bar-track">
                  <div className="bar-fill planned" style={{ width: `${week.plannedRatio}%` }} />
                </div>
                <strong>{week.plannedCalories} kcal</strong>
              </div>
              <div className="bar-block">
                <span>Consumed</span>
                <div className="bar-track">
                  <div className="bar-fill consumed" style={{ width: `${week.consumedRatio}%` }} />
                </div>
                <strong>{week.consumedCalories} kcal</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default App
