import { cn } from '@/lib/utils'
import type { DayInfo } from '@/core/cycleStatus'
import type { DayRecordEntity } from '@/core/store/entities'

export interface DayCellProps {
  dateKey: string
  dayNumber: number
  info: DayInfo | null
  forecast: boolean
  menses: boolean
  monitor: DayRecordEntity['monitor']
  intercourse: boolean
  ovulation: boolean
  isToday: boolean
  onSelect(dateKey: string): void
}

const STATUS_CELL_TONES: Record<DayInfo['status'], { base: string; predicted: string }> = {
  'pre-fertile': { base: 'bg-amber-100', predicted: 'bg-amber-50' },
  fertile: { base: 'bg-rose-200', predicted: 'bg-rose-100' },
  'post-peak': { base: 'bg-emerald-100', predicted: 'bg-emerald-50' },
  'post-calendar': { base: 'bg-stone-100', predicted: 'bg-stone-50' },
}

const MONITOR_DOTS: Record<NonNullable<DayRecordEntity['monitor']>, string> = {
  none: '',
  low: 'bg-sky-400',
  high: 'bg-amber-500',
  peak: 'bg-violet-600',
}

export function DayCell({ dateKey, dayNumber, info, forecast, menses, monitor, intercourse, ovulation, isToday, onSelect }: DayCellProps) {
  const tone = info ? STATUS_CELL_TONES[info.status] : null
  const predicted = info?.source === 'predicted'

  return (
    <button
      type="button"
      data-testid="day-cell"
      data-date={dateKey}
      data-status={info?.status ?? ''}
      data-source={info?.source ?? ''}
      data-forecast={forecast || undefined}
      aria-label={`${dateKey}:${info?.status ?? 'no status'}`}
      onClick={() => onSelect(dateKey)}
      className={cn(
        'relative flex h-12 flex-col items-center justify-center rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:outline-none',
        tone?.base,
        tone && predicted && tone.predicted,
        forecast && 'border border-dashed border-violet-300 bg-violet-50/60',
        isToday && 'ring-2 ring-foreground/70',
        'hover:brightness-105 cursor-pointer',
      )}
    >
      <span className={cn('text-[11px] leading-none', isToday && 'font-bold')}>{dayNumber}</span>
      <span className="mt-1 flex h-2 items-center gap-0.5">
        {monitor && monitor !== 'none' && (
          <span title={`Monitor: ${monitor}`} className={cn('h-1.5 w-1.5 rounded-full', MONITOR_DOTS[monitor])} />
        )}
        {intercourse && <span title="Intercourse" className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
        {menses && <span title="Menses" className="h-1.5 w-1.5 rounded-full bg-red-500" />}
        {ovulation && <span title="Predicted ovulation" className="h-1.5 w-1.5 rounded-full border-2 border-violet-600 bg-white" />}
      </span>
    </button>
  )
}