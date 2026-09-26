import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  FERTILITY_FORECAST_VISUAL,
  FERTILITY_CALENDAR_PHASE_VISUALS,
  FERTILITY_MARKER_VISUALS,
  FERTILITY_MONITOR_VISUALS,
  FERTILITY_TEXT_VISUALS,
} from '@/lib/fertility-visuals'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dayInCycle, todayKey } from '@/core/dateKeys'
import { dayInfo } from '@/core/cycleStatus'
import { isMensesFlow, planCycles } from '@/core/engine/placement'
import { cycleForDate, cycleResultsByCycleId, projectedCyclesThrough } from '@/core/store/selectors'
import { useAppStore } from '@/core/store/useAppStore'
import type { CycleEntity, DayRecordEntity } from '@/core/store/entities'
import { DayCell } from './day-cell'
import { CalendarSummary } from './summary'
import { autoOpenStorageKey, shouldAutoOpenToday } from './auto-open'
import { monthGrid, monthTitle, resolveCell, shiftMonth, weekdayLabels } from './grid'
import { QuickEntry } from './quick-entry'

export function CalendarView() {
  const cycles = useAppStore((s) => s.cycles)
  const dayRecords = useAppStore((s) => s.dayRecords)
  const output = useAppStore((s) => s.output)
  const interpreted = useAppStore((s) => s.settings.algorithmEnabled)
  const settings = useAppStore((s) => s.settings)
  const detailMode = useAppStore((s) => s.settings.calendarDetailMode)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const weekStart = useAppStore((s) => s.settings.weekStart)

  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const autoOpenAttempted = useRef(false)
  const today = todayKey()
  const grid = monthGrid(cursor.year, cursor.month, weekStart)
  const results = cycleResultsByCycleId(output)
  const forecast = output?.forecast?.nextFertileWindow
  // The chain is derived for the month on screen, so paging forward keeps
  // working with no fixed horizon. See projectedCyclesThrough.
  // The last grid week can fall entirely outside the month, so take the last
  // in-month date across every row rather than the final row's last entry.
  const rangeEnd = grid.weeks.flat().filter(Boolean).pop() ?? today
  const projected = useMemo(
    () => projectedCyclesThrough(output, settings, today, rangeEnd),
    [output, settings, today, rangeEnd],
  )
  const currentCycle = cycleForDate(cycles, today)
  const currentCycleDay = currentCycle ? dayInCycle(currentCycle.day1, today) : null
  const currentResult = currentCycle ? results.get(currentCycle.id) : undefined
  const currentInfo =
    currentCycle && currentResult && currentCycleDay !== null
      ? dayInfo(currentResult.fertileWindow, currentResult.peakDay !== null, currentCycleDay)
      : null
  const currentRecord = currentCycle
    ? dayRecords.find((record) => record.cycleId === currentCycle.id && record.date === today)
    : undefined

  useEffect(() => {
    if (autoOpenAttempted.current) {
      return
    }
    autoOpenAttempted.current = true
    const key = autoOpenStorageKey(today)
    const consumed = sessionStorage.getItem(key) !== null
    if (!shouldAutoOpenToday(today, cycles, dayRecords, output, consumed)) {
      return
    }
    sessionStorage.setItem(key, 'consumed')
    setSelected(today)
  }, [cycles, dayRecords, output, today])

  function onSelectDate(date: string) {
    if (date > today) {
      toast('Future dates cannot be logged')
      return
    }
    setSelected(date)
  }

  const selectedCycle = selected ? cycleForDate(cycles, selected) : undefined
  const selectedRecord = selected ? dayRecords.find((r) => r.date === selected) : undefined
  const pending = selected && !selectedCycle ? pendingPlacement(cycles, dayRecords, selected) : null
  const selectedDay = selectedCycle && selected ? dayInCycle(selectedCycle.day1, selected) : (pending?.day ?? 1)

  return (
    <div className="mx-auto w-full max-w-lg space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" aria-label="Previous month" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{monthTitle(cursor.year, cursor.month)}</span>
          <Button variant="ghost" size="sm" onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}>
            Today
          </Button>
        </div>
        <Button variant="outline" size="sm" aria-label="Next month" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <CalendarSummary
        cycle={currentCycle}
        cycleDay={currentCycleDay}
        info={currentInfo}
        monitor={currentRecord?.monitor}
        interpreted={interpreted}
      />

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels(weekStart).map((label) => (
          <div key={label} className={cn('pb-1 text-center text-[11px] font-medium', FERTILITY_TEXT_VISUALS.muted)}>
            {label}
          </div>
        ))}
        {grid.weeks.flatMap((week, w) =>
          week.map((dateKey, d) => {
            if (!dateKey) {
              return <div key={`${w}-${d}`} />
            }
            const cell = resolveCell(cycles, dayRecords, results, forecast, dateKey, today, projected)
            return (
              <DayCell
                key={dateKey}
                dateKey={dateKey}
                dayNumber={Number(dateKey.slice(8))}
                info={interpreted ? cell.info : null}
                forecast={interpreted ? cell.forecast : false}
                menses={cell.menses}
                monitor={cell.monitor}
                intercourse={cell.intercourse}
                isToday={dateKey === today}
                detailMode={detailMode}
                onSelect={onSelectDate}
              />
            )
          }),
        )}
      </div>

      <Legend
        interpreted={interpreted}
        detailMode={detailMode}
        projecting={projected.length > 0}
        onToggleDetail={() => updateSettings({ calendarDetailMode: detailMode === 'simple' ? 'full' : 'simple' })}
      />

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected === today ? 'Day details' : selected}</DialogTitle>
                {selectedCycle ? (
                  <DialogDescription>
                    Cycle day {selectedDay} of the cycle starting {selectedCycle.day1}.
                  </DialogDescription>
                ) : (
                  <DialogDescription>
                    Day {pending?.day ?? 1} of a cycle starting {pending?.day1 ?? selected}. Saving re-derives
                    cycle structure from your logged days.
                  </DialogDescription>
                )}
              </DialogHeader>
              <QuickEntry
                key={`${selectedCycle?.id ?? 'planned'}:${selected}`}
                cycleId={selectedCycle?.id ?? ''}
                date={selected}
                dayInCycle={selectedDay}
                existing={selectedRecord}
                onSaved={() => setSelected(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Read-only preview of where a date would land if saved now, assuming no menses
 * until the user picks a flow. Nothing is written until the form is saved.
 */
function pendingPlacement(
  cycles: CycleEntity[],
  dayRecords: DayRecordEntity[],
  date: string,
): { day1: string; day: number } | null {
  const plans = planCycles(
    [...dayRecords.map((r) => ({ date: r.date, menses: isMensesFlow(r.bloodFlow) })), { date, menses: false }],
    cycles.filter((c) => c.pinned).map((c) => c.day1),
  )
  for (const plan of plans) {
    if (plan.dates.includes(date)) {
      return { day1: plan.day1, day: dayInCycle(plan.day1, date) }
    }
  }
  return null
}

function Legend({
  interpreted,
  detailMode,
  projecting,
  onToggleDetail,
}: {
  interpreted: boolean
  detailMode: 'simple' | 'full'
  projecting: boolean
  onToggleDetail(): void
}) {
  const fullDetail = detailMode === 'full'
  return (
    <div className="space-y-2" data-testid="calendar-legend">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDetail}
          aria-label={fullDetail ? 'Show simple view' : 'Show full detail'}
        >
          {fullDetail ? 'Simple view' : 'Full detail'}
        </Button>
      </div>
      <div className={cn('space-y-1 text-[11px]', FERTILITY_TEXT_VISUALS.muted)}>
        {interpreted && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">Status</span>
            <LegendItem className={cn('rounded', FERTILITY_CALENDAR_PHASE_VISUALS.before.fill)} label="Before" />
            <LegendItem className={cn('rounded', FERTILITY_CALENDAR_PHASE_VISUALS.fertile.fill)} label="Fertile" />
            <LegendItem className={cn('rounded', FERTILITY_CALENDAR_PHASE_VISUALS.after.fill)} label="After" />
            <LegendItem
              className={cn('rounded border', FERTILITY_FORECAST_VISUAL.cellBorder, FERTILITY_FORECAST_VISUAL.fill)}
              label="Predicted window"
            />
            {projecting && (
              // A projected day keeps its phase fill; the dashed border is the
              // cue, so the sample shows a phase fill with that border.
              <LegendItem
                className={cn(
                  'rounded border',
                  FERTILITY_FORECAST_VISUAL.cellBorder,
                  FERTILITY_CALENDAR_PHASE_VISUALS.fertile.fill,
                )}
                label="Projected"
              />
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium">Data</span>
          <LegendStripe className={FERTILITY_MARKER_VISUALS.menses.stripe} label="Menses" />
          <LegendMonitorKey />
        </div>
        {fullDetail && interpreted && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">Details</span>
            <span className="flex items-center gap-1">
              <Heart aria-hidden="true" className={cn('size-2', FERTILITY_MARKER_VISUALS.intercourse.icon)} />
              Intercourse
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1" data-legend-label={label}>
      <span className={cn('h-2.5 w-2.5', className)} />
      {label}
    </span>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1" data-legend-label={label}>
      <span className={cn('h-1.5 w-1.5 rounded-full', className)} />
      {label}
    </span>
  )
}

function LegendStripe({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1" data-legend-label={label}>
      <span className={cn('h-1 w-4 rounded-full', className)} />
      {label}
    </span>
  )
}

function LegendMonitorKey() {
  return (
    <span className="flex items-center gap-1" data-legend-label="Monitor">
      <span>Monitor</span>
      <LegendDot className={FERTILITY_MONITOR_VISUALS.low.dot} label="Low" />
      <LegendDot className={FERTILITY_MONITOR_VISUALS.high.dot} label="High" />
      <LegendDot className={FERTILITY_MONITOR_VISUALS.peak.dot} label="Peak" />
    </span>
  )
}