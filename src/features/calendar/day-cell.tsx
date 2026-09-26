import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  calendarPhaseForStatus,
  FERTILITY_CALENDAR_PHASE_VISUALS,
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_MARKER_VISUALS,
  FERTILITY_MONITOR_VISUALS,
} from '@/lib/fertility-visuals'
import type { DayStatus } from '@/core/engine/types'
import type { CalendarDetailMode, DayRecordEntity } from '@/core/store/entities'

export interface DayCellProps {
  dateKey: string
  dayNumber: number
  info: DayStatus | null
  forecast: boolean
  menses: boolean
  monitor: DayRecordEntity['monitor']
  intercourse: boolean
  ovulation: boolean
  isToday: boolean
  detailMode?: CalendarDetailMode
  onSelect(dateKey: string): void
}

export function DayCell({
  dateKey,
  dayNumber,
  info,
  forecast,
  menses,
  monitor,
  intercourse,
  ovulation,
  isToday,
  detailMode = 'simple',
  onSelect,
}: DayCellProps) {
  const phase = info ? calendarPhaseForStatus(info) : null
  const phaseVisual = phase ? FERTILITY_CALENDAR_PHASE_VISUALS[phase] : null
  const monitorText = monitor && monitor !== 'none' ? `monitor ${monitor}` : null
  const accessibleParts = [
    dateKey,
    phaseVisual?.label ?? 'no status',
    monitorText,
    menses ? 'menses' : null,
    detailMode === 'full' && intercourse ? 'intercourse' : null,
    detailMode === 'full' && ovulation ? 'predicted ovulation' : null,
  ].filter((part): part is string => !!part)

  const statusFill = forecast
    ? FERTILITY_FORECAST_VISUAL.fill
    : phaseVisual
      ? phaseVisual.fill
      : undefined
  const statusCue = forecast ? cn('border', FERTILITY_FORECAST_VISUAL.cellBorder) : undefined

  return (
    <button
      type="button"
      data-testid="day-cell"
      data-date={dateKey}
      data-status={info ?? ''}
      data-phase={phase ?? undefined}
      data-forecast={forecast || undefined}
      aria-label={accessibleParts.join(', ')}
      onClick={() => onSelect(dateKey)}
      className={cn(
        'relative flex h-12 flex-col items-center justify-center overflow-hidden rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:outline-none',
        statusFill,
        statusCue,
        isToday && 'ring-2 ring-foreground/70',
        'hover:brightness-105 cursor-pointer',
      )}
    >
      <span className={cn('text-[11px] leading-none', isToday && 'font-bold')}>{dayNumber}</span>
      {monitor && monitor !== 'none' && (
        <span
          data-testid="calendar-monitor-marker"
          title={`Monitor: ${monitor}`}
          className={cn('mt-1 size-2.5 rounded-full', FERTILITY_MONITOR_VISUALS[monitor].dot)}
        />
      )}
      {menses && (
        <span
          data-testid="calendar-menses-stripe"
          title="Menses"
          aria-hidden="true"
          className={cn('absolute inset-x-1 bottom-0 h-1 rounded-full', FERTILITY_MARKER_VISUALS.menses.stripe)}
        />
      )}
      {detailMode === 'full' && (
        <span className="mt-1 flex h-2.5 items-center gap-0.5">
          {intercourse && (
            <span title="Intercourse" className="inline-flex">
              <Heart aria-hidden="true" className={cn('size-2', FERTILITY_MARKER_VISUALS.intercourse.icon)} />
            </span>
          )}
          {ovulation && (
            <span
              title="Predicted ovulation"
              className={cn('size-2 rounded-full', FERTILITY_MARKER_VISUALS.ovulation.dot)}
            />
          )}
        </span>
      )}
    </button>
  )
}
