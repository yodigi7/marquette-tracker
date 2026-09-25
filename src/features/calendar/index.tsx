import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dayInCycle, todayKey } from '@/core/dateKeys'
import type { EngineOutput } from '@/core/engine/engineSdk'
import { isMensesFlow, planCycles } from '@/core/engine/placement'
import { cycleForDate, cycleResultsByCycleId, recordsForMode } from '@/core/store/selectors'
import { useAppStore } from '@/core/store/useAppStore'
import type { CycleEntity, DayRecordEntity } from '@/core/store/entities'
import { DayCell } from './day-cell'
import { autoOpenStorageKey, shouldAutoOpenToday } from './auto-open'
import { monthGrid, monthTitle, resolveCell, shiftMonth, weekdayLabels } from './grid'
import { QuickEntry } from './quick-entry'

export function CalendarView() {
  const cycles = useAppStore((s) => s.cycles)
  const allDayRecords = useAppStore((s) => s.dayRecords)
  const output = useAppStore((s) => s.output)
  const interpreted = useAppStore((s) => s.settings.algorithmEnabled)
  const dayRecords = useMemo(() => recordsForMode(allDayRecords, interpreted), [allDayRecords, interpreted])
  const weekStart = useAppStore((s) => s.settings.weekStart)

  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const autoOpenAttempted = useRef(false)
  const today = todayKey()
  const grid = monthGrid(cursor.year, cursor.month, weekStart)
  const results = cycleResultsByCycleId(output)
  const forecast = output?.forecast?.nextFertileWindow
  const predictedOvulationDay = predictedOvulationOf(output)

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

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels(weekStart).map((label) => (
          <div key={label} className="pb-1 text-center text-[11px] font-medium text-stone-400">
            {label}
          </div>
        ))}
        {grid.weeks.flatMap((week, w) =>
          week.map((dateKey, d) => {
            if (!dateKey) {
              return <div key={`${w}-${d}`} />
            }
            const cell = resolveCell(cycles, dayRecords, results, forecast, dateKey, today, predictedOvulationDay)
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
                origin={cell.origin}
                ovulation={interpreted ? cell.ovulation : false}
                isToday={dateKey === today}
                onSelect={onSelectDate}
              />
            )
          }),
        )}
      </div>

      <Legend />

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

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
      <LegendItem className="rounded bg-rose-200" label="Fertile" />
      <LegendItem className="rounded bg-amber-100" label="Pre-fertile" />
      <LegendItem className="rounded bg-emerald-100" label="Post-peak" />
      <LegendItem className="rounded border border-dashed border-violet-300" label="Predicted window" />
      <LegendDot className="bg-red-500" label="Menses" />
      <LegendDot className="border border-dashed border-amber-500" label="Assumed data" />
      <LegendDot className="bg-sky-400" label="Low" />
      <LegendDot className="bg-amber-500" label="High" />
      <LegendDot className="bg-violet-600" label="Peak" />
      <span className="flex items-center gap-1">
        <Heart aria-hidden="true" className="size-2 fill-red-500 text-red-500" />
        Intercourse
      </span>
      <LegendDot className="border-2 border-violet-600 bg-white" label="Predicted ovulation" />
    </div>
  )
}

function predictedOvulationOf(output: EngineOutput | null): number | undefined {
  const forecast = output?.forecast
  if (!forecast) {
    return undefined
  }
  // Prefer the average historical Peak day; fall back to a typical mid-cycle day.
  return forecast.peakDayEarliest > 0 ? Math.round(forecast.peakDayMean) : 14
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-2.5 w-2.5', className)} />
      {label}
    </span>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-1.5 w-1.5 rounded-full', className)} />
      {label}
    </span>
  )
}