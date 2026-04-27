import type { AppState, ExtraFood, MealBox, PlannerEntry } from './types'
import { scaleNutrition } from './utils'
import { findEntrySource } from './selectors'

function getModelNumber(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  return (Math.abs(hash) % 6) + 1
}

function BoxSketchBlobs({ model }: { model: number }) {
  const w = 500
  const h = 180
  const p = (x: number, y: number) => `${w * x} ${h * y}`

  if (model === 1) {
    return (
      <>
        <path d={`M ${p(0.62, 0.15)} Q ${p(0.85, 0.05)} ${p(0.98, 0.3)} Q ${p(1.02, 0.6)} ${p(0.85, 0.75)} Q ${p(0.6, 0.82)} ${p(0.55, 0.55)} Q ${p(0.55, 0.3)} ${p(0.62, 0.15)} Z`} fill="var(--box-blob-a)" opacity="0.28" />
        <path d={`M ${p(0.72, 0.35)} Q ${p(0.9, 0.3)} ${p(0.92, 0.5)} Q ${p(0.82, 0.6)} ${p(0.72, 0.55)} Q ${p(0.65, 0.45)} ${p(0.72, 0.35)} Z`} fill="var(--box-blob-c)" opacity="0.30" />
        <path d={`M ${-w * 0.05} ${h * 0.7} Q ${p(0.15, 0.6)} ${p(0.35, 0.78)} Q ${p(0.4, 1)} ${p(0.15, 1.08)} Q ${-w * 0.08} ${h * 1.02} ${-w * 0.05} ${h * 0.7} Z`} fill="var(--box-blob-b)" opacity="0.22" />
      </>
    )
  }

  if (model === 2) {
    return (
      <>
        <path d={`M ${-w * 0.05} ${h * 0.55} Q ${p(0.25, 0.35)} ${p(0.5, 0.5)} Q ${p(0.75, 0.7)} ${p(1.05, 0.45)} L ${p(1.05, 1.05)} L ${-w * 0.05} ${h * 1.05} Z`} fill="var(--box-blob-a)" opacity="0.18" />
        <circle cx={w * 0.88} cy={h * 0.22} r={h * 0.18} fill="var(--box-blob-c)" opacity="0.20" />
      </>
    )
  }

  if (model === 3) {
    return (
      <>
        <path d={`M ${p(0.08, 0.22)} Q ${p(0.28, 0.08)} ${p(0.42, 0.28)} Q ${p(0.48, 0.55)} ${p(0.25, 0.65)} Q ${p(0.02, 0.58)} ${-w * 0.02} ${h * 0.38} Q ${p(0.02, 0.28)} ${p(0.08, 0.22)} Z`} fill="var(--box-blob-a)" opacity="0.26" />
        <path d={`M ${p(0.58, 0.62)} Q ${p(0.78, 0.52)} ${p(0.92, 0.72)} Q ${p(0.98, 1.02)} ${p(0.75, 1.1)} Q ${p(0.52, 1)} ${p(0.5, 0.82)} Q ${p(0.5, 0.7)} ${p(0.58, 0.62)} Z`} fill="var(--box-blob-b)" opacity="0.24" />
        <path d={`M ${p(0.7, 0.05)} Q ${p(0.9, 0)} ${p(0.95, 0.2)} Q ${p(0.85, 0.35)} ${p(0.68, 0.28)} Q ${p(0.6, 0.15)} ${p(0.7, 0.05)} Z`} fill="var(--box-blob-c)" opacity="0.32" />
      </>
    )
  }

  if (model === 4) {
    const wave = (y: number) => {
      const step = w * 0.18
      let d = `M ${-w * 0.02} ${y}`
      for (let index = 0; index < 8; index += 1) {
        d += ` q ${step / 2} ${(index % 2 === 0 ? -1 : 1) * h * 0.08} ${step} 0`
      }
      return d
    }
    return (
      <>
        <path d={wave(h * 0.3)} stroke="var(--box-blob-a)" strokeWidth={h * 0.06} fill="none" strokeLinecap="round" opacity="0.18" />
        <path d={wave(h * 0.65)} stroke="var(--box-blob-b)" strokeWidth={h * 0.06} fill="none" strokeLinecap="round" opacity="0.18" />
        <path d={wave(h * 0.95)} stroke="var(--box-blob-a)" strokeWidth={h * 0.06} fill="none" strokeLinecap="round" opacity="0.15" />
      </>
    )
  }

  if (model === 5) {
    return (
      <>
        <path d={`M ${-w * 0.05} ${h * 0.78} Q ${p(0.15, 0.6)} ${p(0.4, 0.72)} Q ${p(0.65, 0.88)} ${p(0.85, 0.7)} Q ${p(1.05, 0.6)} ${p(1.1, 0.85)} L ${p(1.1, 1.1)} L ${-w * 0.05} ${h * 1.1} Z`} fill="var(--box-blob-a)" opacity="0.22" />
        <path d={`M ${p(0.15, 0.85)} Q ${p(0.35, 0.75)} ${p(0.55, 0.82)} Q ${p(0.75, 0.92)} ${p(0.95, 0.85)} L ${p(0.95, 1.05)} L ${p(0.15, 1.05)} Z`} fill="var(--box-blob-b)" opacity="0.28" />
        <path d={`M ${p(0.75, 0.1)} Q ${p(0.95, 0.05)} ${p(1, 0.28)} Q ${p(0.9, 0.42)} ${p(0.72, 0.35)} Q ${p(0.62, 0.22)} ${p(0.75, 0.1)} Z`} fill="var(--box-blob-c)" opacity="0.32" />
      </>
    )
  }

  return (
    <>
      <path d={`M ${-w * 0.05} ${h * 0.48} Q ${p(0.2, 0.23)} ${p(0.45, 0.53)} Q ${p(0.7, 0.83)} ${p(1.05, 0.53)} L ${p(1.05, 0.73)} Q ${p(0.7, 1.03)} ${p(0.45, 0.73)} Q ${p(0.2, 0.43)} ${-w * 0.05} ${h * 0.68} Z`} fill="var(--box-blob-b)" opacity="0.18" />
      <path d={`M ${-w * 0.05} ${h * 0.4} Q ${p(0.2, 0.15)} ${p(0.45, 0.45)} Q ${p(0.7, 0.75)} ${p(1.05, 0.45)} L ${p(1.05, 0.65)} Q ${p(0.7, 0.95)} ${p(0.45, 0.65)} Q ${p(0.2, 0.35)} ${-w * 0.05} ${h * 0.6} Z`} fill="var(--box-blob-a)" opacity="0.26" />
      <circle cx={w * 0.92} cy={h * 0.18} r={h * 0.1} fill="var(--box-blob-c)" opacity="0.30" />
    </>
  )
}

export function BoxCard({
  box,
  onFractionChange,
  onSelect,
  onDragStart,
  selected,
  modelNumber,
  hideMetrics,
  hidePortionControl,
  compact,
  used,
  stopPropagationOnClick,
  stopPropagationOnDragStart,
  titleOverride,
  assignedTone,
  recipeTop,
}: {
  box: MealBox
  onFractionChange?: (value: number) => void
  onSelect?: () => void
  onDragStart?: () => void
  selected?: boolean
  modelNumber?: number
  hideMetrics?: boolean
  hidePortionControl?: boolean
  compact?: boolean
  used?: boolean
  stopPropagationOnClick?: boolean
  stopPropagationOnDragStart?: boolean
  titleOverride?: string
  assignedTone?: boolean
  recipeTop?: boolean
}) {
  const scaled = scaleNutrition(box.baseNutrition, box.portionFraction)
  const resolvedModelNumber = modelNumber ?? getModelNumber(box.recipeVersionId)
  const modelClass = `box-model-${resolvedModelNumber}`
  const classes = [
    'box-card',
    'box-card-unassigned',
    modelClass,
    selected ? 'selected' : '',
    compact ? 'box-card-compact' : '',
    used ? 'box-card-used' : '',
    assignedTone ? 'box-card-assigned-tone' : '',
    recipeTop ? 'box-card-recipe-top' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      draggable={Boolean(onDragStart)}
      onDragStart={(event) => {
        if (stopPropagationOnDragStart) {
          event.stopPropagation()
        }
        onDragStart?.()
      }}
      onClick={(event) => {
        if (stopPropagationOnClick) {
          event.stopPropagation()
        }
        onSelect?.()
      }}
    >
      <div className="box-sketch-blobs" aria-hidden="true">
        <svg viewBox="0 0 500 180" preserveAspectRatio="xMidYMid slice">
          <BoxSketchBlobs model={resolvedModelNumber} />
        </svg>
      </div>
      <div className="box-sheen" aria-hidden="true" />
      <div className="box-top">
        <strong>
          {titleOverride ?? `#${box.boxNumber} ${box.label}`}
        </strong>
      </div>
      {hideMetrics ? null : (
        <div className="box-metrics">
          <span>{scaled.calories} kcal</span>
          <span>{scaled.protein}P</span>
          <span>{scaled.carbs}C</span>
          <span>{scaled.fat}F</span>
        </div>
      )}
      {hidePortionControl ? null : (
        <label>
          {box.portionFraction >= 1 ? (
            <button type="button" onClick={() => onFractionChange?.(0.5)}>
              Split
            </button>
          ) : (
            <span className="muted">Half portion</span>
          )}
        </label>
      )}
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
  versionModelMap,
}: {
  entry: PlannerEntry
  state: AppState
  onRemove: () => void
  onPortionChange: (value: number) => void
  onDragStart?: () => void
  removeLabel?: string
  versionModelMap?: Record<string, number>
}) {
  const source = findEntrySource(entry, state)
  if (!source) return null
  const linkedBox =
    entry.sourceType === 'box'
      ? state.boxes.find((item) => item.id === entry.sourceId)
      : null
  const modelNumber = linkedBox
    ? (versionModelMap?.[linkedBox.recipeVersionId] ?? getModelNumber(linkedBox.recipeVersionId))
    : null
  const modelClass = modelNumber ? `box-model-${modelNumber}` : ''

  return (
    <div
      className={
        entry.sourceType === 'box'
          ? `planner-card planner-card-assigned ${modelClass}`
          : 'planner-card planner-card-extra'
      }
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
    >
      {entry.sourceType === 'box' && modelNumber ? (
        <>
          <div className="box-sketch-blobs" aria-hidden="true">
            <svg viewBox="0 0 500 180" preserveAspectRatio="xMidYMid slice">
              <BoxSketchBlobs model={modelNumber} />
            </svg>
          </div>
          <div className="box-sheen" aria-hidden="true" />
        </>
      ) : null}
      <div className="box-top">
        <strong>{source.title}</strong>
      </div>
      <div className="box-metrics">
        <span>{source.planned.calories} kcal</span>
        <span>{source.planned.protein}P</span>
        <span>{source.planned.carbs}C</span>
        <span>{source.planned.fat}F</span>
      </div>
      <div className="planner-card-actions">
        {entry.sourceType === 'box' ? (
          <label>
            {source.portionFraction >= 1 ? (
              <button type="button" onClick={() => onPortionChange(0.5)}>
                Split
              </button>
            ) : (
              <span className="muted">Half portion</span>
            )}
          </label>
        ) : null}
        <button
          type="button"
          className="planner-unassign-button"
          onClick={onRemove}
        >
          {removeLabel ?? 'Unassign'}
        </button>
      </div>
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
