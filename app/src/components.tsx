import type { AppState, ExtraFood, MealBox, PlannerEntry } from './types'
import { scaleNutrition } from './utils'
import { findEntrySource } from './selectors'

export function BoxCard({
  box,
  onFractionChange,
  onSelect,
  onDragStart,
  selected,
}: {
  box: MealBox
  onFractionChange: (value: number) => void
  onSelect?: () => void
  onDragStart?: () => void
  selected?: boolean
}) {
  const scaled = scaleNutrition(box.baseNutrition, box.portionFraction)
  return (
    <div
      className={selected ? 'box-card selected' : 'box-card'}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onClick={onSelect}
    >
      <div className="box-top">
        <strong>
          #{box.boxNumber} {box.label}
        </strong>
        <span>{box.portionFraction}x</span>
      </div>
      <div className="box-metrics">
        <span>{scaled.calories} kcal</span>
        <span>{scaled.protein}P</span>
        <span>{scaled.carbs}C</span>
        <span>{scaled.fat}F</span>
      </div>
      <label>
        Portion
        {box.portionFraction >= 1 ? (
          <button type="button" onClick={() => onFractionChange(0.5)}>
            Split to 2 halves
          </button>
        ) : (
          <span className="muted">Half portion</span>
        )}
      </label>
    </div>
  )
}

export function PlannerCard({
  entry,
  state,
  onRemove,
  onPortionChange,
  onDragStart,
  removeLabel,
}: {
  entry: PlannerEntry
  state: AppState
  onRemove: () => void
  onPortionChange: (value: number) => void
  onDragStart?: () => void
  removeLabel?: string
}) {
  const source = findEntrySource(entry, state)
  if (!source) return null

  return (
    <div
      className="planner-card"
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
    >
      <div className="box-top">
        <strong>{source.title}</strong>
        <button onClick={onRemove}>{removeLabel ?? 'Unassign'}</button>
      </div>
      <div className="box-metrics">
        <span>{source.planned.calories} kcal</span>
        <span>{source.planned.protein}P</span>
        <span>{source.planned.carbs}C</span>
        <span>{source.planned.fat}F</span>
      </div>
      {entry.sourceType === 'box' ? (
        <label>
          Portion
          {source.portionFraction >= 1 ? (
            <button type="button" onClick={() => onPortionChange(0.5)}>
              Split to 2 halves
            </button>
          ) : (
            <span className="muted">Half portion</span>
          )}
        </label>
      ) : null}
    </div>
  )
}

export function ExtraCard({
  extra,
  onDragStart,
  onDelete,
}: {
  extra: ExtraFood
  onDragStart?: () => void
  onDelete: () => void
}) {
  return (
    <div className="extra-card" draggable={Boolean(onDragStart)} onDragStart={onDragStart}>
      <div className="box-top">
        <strong>{extra.name}</strong>
        <button onClick={onDelete}>Delete</button>
      </div>
      <div className="box-metrics">
        <span>{extra.nutrition.calories} kcal</span>
        <span>{extra.nutrition.protein}P</span>
        <span>{extra.nutrition.carbs}C</span>
        <span>{extra.nutrition.fat}F</span>
      </div>
    </div>
  )
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}
