import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_MARKER_VISUALS,
  FERTILITY_MONITOR_VISUALS,
  FERTILITY_SOURCE_VISUALS,
  FERTILITY_STATUS_VISUALS,
} from '@/lib/fertility-visuals'
import type { DayInfo } from '@/core/cycleStatus'
import type { DayRecordEntity } from '@/core/store/entities'
import type { CellOrigin } from './grid'

export interface DayCellProps {
  dateKey: string
  dayNumber: number
  info: DayInfo | null
  forecast: boolean
  menses: boolean
  monitor: DayRecordEntity['monitor']
  intercourse: boolean
  origin: CellOrigin
  ovulation: boolean
  isToday: boolean
  onSelect(dateKey: string): void
}

export function DayCell({ dateKey, dayNumber, info, forecast, menses, monitor, intercourse, origin, ovulation, isToday, onSelect }: DayCellProps) {
  const statusVisual = info ? FERTILITY_STATUS_VISUALS[info.status] : null
  const sourceVisual = info ? FERTILITY_SOURCE_VISUALS[info.source] : null
  const assumed = origin === 'inferred'
  const statusFill = forecast
    ? FERTILITY_FORECAST_VISUAL.fill
    : statusVisual
      ? info?.source === 'predicted'
        ? statusVisual.predictedFill
        : statusVisual.fill
      : undefined
  const statusCue = forecast
    ? cn('border', FERTILITY_FORECAST_VISUAL.cellBorder)
    : sourceVisual
      ? cn('border', sourceVisual.cellBorder)
      : undefined

  return (
    <button
      type="button"
      data-testid="day-cell"
      data-date={dateKey}
      data-status={info?.status ?? ''}
      data-source={info?.source ?? ''}
      data-origin={origin === 'none' ? undefined : origin}
      data-forecast={forecast || undefined}
      aria-label={`${dateKey}:${info?.status ?? 'no status'}${assumed ? ', assumed data' : ''}`}
      onClick={() => onSelect(dateKey)}
      className={cn(
        'relative flex h-12 flex-col items-center justify-center rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:outline-none',
        statusFill,
        statusCue,
        isToday && 'ring-2 ring-foreground/70',
        'hover:brightness-105 cursor-pointer',
      )}
    >
      <span className={cn('text-[11px] leading-none', isToday && 'font-bold')}>{dayNumber}</span>
      <span className="mt-1 flex h-2 items-center gap-0.5">
        {monitor && monitor !== 'none' && (
          <span title={`Monitor: ${monitor}`} className={cn('h-1.5 w-1.5 rounded-full', FERTILITY_MONITOR_VISUALS[monitor].dot)} />
        )}
        {intercourse && (
          <span title="Intercourse" className="inline-flex">
            <Heart aria-hidden="true" className={cn('size-2', FERTILITY_MARKER_VISUALS.intercourse.icon)} />
          </span>
        )}
        {assumed && <span title="Assumed data" aria-label="Assumed data" className={cn('h-1.5 w-1.5 rounded-full', FERTILITY_MARKER_VISUALS.assumed.dot)} />}
        {menses && <span title="Menses" className={cn('h-1.5 w-1.5 rounded-full', FERTILITY_MARKER_VISUALS.menses.dot)} />}
        {ovulation && <span title="Predicted ovulation" className={cn('h-1.5 w-1.5 rounded-full', FERTILITY_MARKER_VISUALS.ovulation.dot)} />}
      </span>
    </button>
  )
}
