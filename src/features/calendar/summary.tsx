import { calendarPhaseForStatus, calendarPhaseLabel, FERTILITY_TEXT_VISUALS } from '@/lib/fertility-visuals'
import { cn } from '@/lib/utils'
import type { DayStatus } from '@/core/engine/types'
import type { DayRecordEntity, CycleEntity } from '@/core/store/entities'
import type { MonitorReading } from '@/core/engine/types'

export interface CalendarSummaryProps {
  cycle: CycleEntity | undefined
  cycleDay: number | null
  info: DayStatus | null
  monitor: DayRecordEntity['monitor']
  interpreted: boolean
}

const monitorLabel: Record<Exclude<MonitorReading, 'none'>, string> = {
  low: 'Low',
  high: 'High',
  peak: 'Peak',
}

export function CalendarSummary({ cycle, cycleDay, info, monitor, interpreted }: CalendarSummaryProps) {
  const phase = info ? calendarPhaseForStatus(info) : null
  const monitorText = monitor && monitor !== 'none' ? monitorLabel[monitor] : null

  return (
    <div
      data-testid="calendar-summary"
      aria-live="polite"
      className="rounded-md border bg-card px-3 py-2 text-xs"
    >
      {!cycle || cycleDay === null ? (
        <p className={cn('font-medium', FERTILITY_TEXT_VISUALS.muted)}>No cycle yet</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={cn('font-medium', FERTILITY_TEXT_VISUALS.body)}>
            Cycle {cycle.cycleNo} · Day {cycleDay}
          </span>
          {interpreted && phase ? (
            <span className={cn('font-medium', FERTILITY_TEXT_VISUALS.body)} data-testid="calendar-summary-phase">
              {calendarPhaseLabel(phase)}
            </span>
          ) : (
            <span className={cn('font-medium', FERTILITY_TEXT_VISUALS.muted)} data-testid="calendar-summary-mode">
              Logging only
            </span>
          )}
          <span className={FERTILITY_TEXT_VISUALS.muted} data-testid="calendar-summary-monitor">
            {monitorText ? `Monitor: ${monitorText}` : 'No monitor logged'}
          </span>
        </div>
      )}
    </div>
  )
}
